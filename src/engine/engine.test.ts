import { describe, expect, it } from "vitest";
import { KAMUS, KANJI, KMAP, bisaDipelajari, bisaRakit, kosakataUntuk } from "../data/katalog";
import { KOSONG } from "../db/penyimpanan";
import type { AppData } from "../types";
import { D0, W, greenStrength, jarakHari, nextD, statusOf } from "./fsrs";
import { applyAnswer, applyWrite } from "./penilaian";
import { PROSES_MAKS, TULIS_MAKS, aktif, buildSession, daftarTulis, sesiPilihan } from "./sesi";
import { addDays } from "./tanggal";

const K = "先"; // kanji N5 dengan banyak kosakata
const HARI0 = "2026-09-20";
const hari = (n: number) => addDays(HARI0, n);
const baru = (o: Partial<AppData> = {}): AppData => ({ ...KOSONG, ...o });

describe("status & hitungan (metode 2–3)", () => {
  it("empat status: putih → merah → oranye → hijau", () => {
    expect(statusOf(undefined)).toBe("white");
    let d = applyAnswer(baru(), K, false, hari(0));
    expect(statusOf(d.ks[K])).toBe("red");
    d = applyAnswer(d, K, true, hari(1));
    expect(statusOf(d.ks[K])).toBe("orange");
    for (let i = 2; i <= 5; i++) d = applyAnswer(d, K, true, hari(i));
    expect(d.ks[K]!.readyWrite).toBe(true);
    expect(statusOf(d.ks[K])).toBe("orange"); // belum hijau sebelum lulus menulis
    d = applyWrite(d, K, true, hari(5));
    expect(statusOf(d.ks[K])).toBe("green");
  });

  it("benar 5 kali (boleh di hari yang sama) → siap sesi menulis", () => {
    let d = baru();
    for (let i = 0; i < 4; i++) d = applyAnswer(d, K, true, hari(0));
    expect(d.ks[K]!.count).toBe(4);
    expect(d.ks[K]!.readyWrite).toBeUndefined();
    d = applyAnswer(d, K, true, hari(0));
    expect(d.ks[K]!.readyWrite).toBe(true);
    expect(daftarTulis(d)).toContain(K);
  });

  it("salah sekali → hitungan kembali ke nol", () => {
    let d = baru();
    for (let i = 0; i < 4; i++) d = applyAnswer(d, K, true, hari(i));
    d = applyAnswer(d, K, false, hari(4));
    expect(d.ks[K]!.count).toBe(0);
  });

  it("gagal menulis: kanji tetap menunggu sesi menulis, tidak hijau", () => {
    let d = baru();
    for (let i = 0; i < 5; i++) d = applyAnswer(d, K, true, hari(i));
    const setelah = applyWrite(d, K, false, hari(5));
    expect(setelah).toBe(d);
    expect(statusOf(setelah.ks[K])).toBe("orange");
  });
});

describe("ganti kosakata setelah salah 3 kali berturut-turut (metode 4)", () => {
  it("vi bertambah pada salah ke-3, bukan sebelumnya", () => {
    let d = baru();
    d = applyAnswer(d, K, false, hari(0));
    d = applyAnswer(d, K, false, hari(1));
    expect(d.ks[K]!.vi).toBe(0);
    d = applyAnswer(d, K, false, hari(2));
    expect(d.ks[K]!.vi).toBe(1);
    expect(d.ks[K]!.wrongStreak).toBe(0);
  });

  it("jawaban benar di antaranya memutus rentetan", () => {
    let d = baru();
    d = applyAnswer(d, K, false, hari(0));
    d = applyAnswer(d, K, false, hari(1));
    d = applyAnswer(d, K, true, hari(2)); // vi naik satu karena pertemuan baru
    const vi = d.ks[K]!.vi;
    d = applyAnswer(d, K, false, hari(3));
    expect(d.ks[K]!.vi).toBe(vi);
  });
});

describe("penjadwalan (FSRS v4.5)", () => {
  it("fase belajar tidak memakai jarak hari: lima kali benar bisa selesai di hari yang sama", () => {
    // Jarak 1-1-2-4-7 hari dihapus 2026-10-19: benar ke-5 paling cepat jatuh di hari ke-8,
    // jadi soal tulis praktis tidak pernah muncul. Yang mengatur urutan sekarang antrean sesi.
    let d = baru();
    for (let i = 0; i < 5; i++) d = applyAnswer(d, K, true, HARI0);
    expect(d.ks[K]!.count).toBe(5);
    expect(d.ks[K]!.readyWrite).toBe(true);
    expect(daftarTulis(d)).toContain(K);
  });

  it("lulus menulis: stabilitas awal W[3] dan jarak ≈ 14 hari", () => {
    let d = baru();
    for (let i = 0; i < 5; i++) d = applyAnswer(d, K, true, hari(i));
    d = applyWrite(d, K, true, hari(5));
    expect(d.ks[K]!.S).toBe(W[3]);
    expect(d.ks[K]!.interval).toBe(14);
    expect(d.ks[K]!.due).toBe(hari(19));
  });

  it("benar di fase hijau memperbesar stabilitas; salah menurunkannya dan mengganti kosakata", () => {
    let d = baru();
    for (let i = 0; i < 5; i++) d = applyAnswer(d, K, true, hari(i));
    d = applyWrite(d, K, true, hari(5));
    const S0 = d.ks[K]!.S!;
    const benar = applyAnswer(d, K, true, hari(19));
    expect(benar.ks[K]!.S!).toBeGreaterThan(S0);
    const salah = applyAnswer(d, K, false, hari(19));
    expect(salah.ks[K]!.S!).toBeLessThan(S0);
    expect(salah.ks[K]!.vi).toBe(d.ks[K]!.vi + 1);
    expect(salah.ks[K]!.green).toBe(true); // tetap hijau, hanya jadwalnya yang rapat
  });
});

describe("penyusun sesi (metode 1, 5–7)", () => {
  it("satu sesi = maksimum 10 soal, tiap kanji sekali", () => {
    const p = buildSession(baru({ tg: "N1" }), HARI0);
    expect(p.quiz.length).toBeLessThanOrEqual(10);
    expect(new Set(p.quiz.map((x) => x.k)).size).toBe(p.quiz.length);
  });

  it("beban menyesuaikan ketepatan: <70% tanpa kanji baru, 70–90% dua, >90% tiga", () => {
    // 6 kanji merah: antrean belum penuh, jadi jatah kanji baru terlihat murni
    const merah = Object.fromEntries(
      aktif({ tg: "N5" }).slice(0, 6).map((x) => [x.kanji, { seen: true, vi: 0, count: 0, wrongStreak: 0, lastSeen: hari(-1) }]),
    );
    const kanjiBaru = (acc: number | null) =>
      buildSession(baru({ tg: "N5", ks: merah, lastAcc: acc }), HARI0).quiz.filter((x) => !merah[x.k]).length;
    expect(kanjiBaru(0.6)).toBe(0);
    expect(kanjiBaru(null)).toBe(2);
    expect(kanjiBaru(0.8)).toBe(2);
    expect(kanjiBaru(0.95)).toBe(3);
  });

  it("akurasi <70%: sesi memendek daripada mengisi kuota dengan kanji baru", () => {
    const empat = Object.fromEntries(
      aktif({ tg: "N5" }).slice(0, 4).map((x) => [x.kanji, { seen: true, vi: 0, count: 0, wrongStreak: 0, lastSeen: hari(-1) }]),
    );
    expect(buildSession(baru({ tg: "N5", ks: empat, lastAcc: 0.5 }), HARI0).quiz.length).toBe(4);
    expect(buildSession(baru({ tg: "N5", ks: empat, lastAcc: 0.8 }), HARI0).quiz.length).toBe(6); // 4 + jatah 2
  });

  it("sesi pertama: kuota diisi kanji baru", () => {
    expect(buildSession(baru({ tg: "N5" }), HARI0).quiz.length).toBe(10);
  });

  it("antrean penuh: tidak ada kanji baru walau ketepatan tinggi", () => {
    const penuh = Object.fromEntries(
      aktif({ tg: "N5" }).slice(0, PROSES_MAKS).map((x) => [x.kanji, { seen: true, vi: 0, count: 1, wrongStreak: 0, everCorrect: true, lastSeen: hari(-1) }]),
    );
    const p = buildSession(baru({ tg: "N5", ks: penuh, lastAcc: 0.95 }), HARI0);
    expect(p.quiz.length).toBe(10);
    expect(p.quiz.every((it) => !!penuh[it.k])).toBe(true);
  });

  it("soal tulis yang menumpuk ikut menahan kanji baru", () => {
    const menunggu = Object.fromEntries(
      aktif({ tg: "N5" }).slice(0, PROSES_MAKS).map((x) => [x.kanji, {
        seen: true, vi: 0, count: 5, wrongStreak: 0, everCorrect: true, readyWrite: true, lastSeen: hari(-1),
      }]),
    );
    const p = buildSession(baru({ tg: "N5", ks: menunggu, lastAcc: 0.95 }), HARI0);
    expect(p.quiz.length).toBe(0); // selesaikan dulu yang menunggu ditulis
    expect(p.write.length).toBe(TULIS_MAKS);
  });

  it("antrean bergilir: kanji yang paling lama tidak dilatih didahulukan", () => {
    const urut = aktif({ tg: "N5" }).slice(0, 12).map((x) => x.kanji);
    const ks = Object.fromEntries(urut.map((k, i) => [k, {
      seen: true, vi: 0, count: 1, wrongStreak: 0, everCorrect: true, seq: i + 1, lastSeen: HARI0,
    }]));
    const dipilih = new Set(buildSession(baru({ tg: "N5", ks, lastAcc: 0.95 }), HARI0).quiz.map((x) => x.k));
    expect(urut.slice(0, 10).every((k) => dipilih.has(k))).toBe(true);
    expect(urut.slice(10).some((k) => dipilih.has(k))).toBe(false);
  });

  it("sesi ditutup dengan soal yang paling mungkin benar (hitungan tertinggi)", () => {
    const [a, b, c] = aktif({ tg: "N5" }).map((x) => x.kanji);
    const s = (count: number) => ({ seen: true, vi: 0, count, wrongStreak: 0, everCorrect: true, lastSeen: hari(-1), due: HARI0 });
    const p = buildSession(baru({ ks: { [a!]: s(1), [b!]: s(4), [c!]: s(2) }, lastAcc: 0.6 }), HARI0);
    expect(p.quiz.at(-1)!.k).toBe(b);
  });

  it("sesi bisa diulang di hari yang sama: kanji yang baru dijawab hari ini tetap muncul", () => {
    const [a, b, c] = aktif({ tg: "N5" }).map((x) => x.kanji);
    const hariIni = { seen: true, vi: 0, count: 0, wrongStreak: 0, lastSeen: HARI0, seq: 1 };
    const oranyeBesok = { ...hariIni, count: 1, everCorrect: true, seq: 2 };
    const ks = { [a!]: hariIni, [b!]: oranyeBesok, [c!]: { ...oranyeBesok, count: 2 } };
    const p = buildSession(baru({ ks, lastAcc: 0.6 }), HARI0);
    expect(p.quiz.map((x) => x.k).sort()).toEqual([a, b, c].sort());
  });

  it("sesi kanji pilihan: hanya kanji yang dipilih, maksimum 10, tanpa memandang jadwal", () => {
    const semua = aktif({ tg: "N5" }).map((x) => x.kanji);
    const jadwalBesok = { seen: true, vi: 0, count: 1, wrongStreak: 0, everCorrect: true, lastSeen: HARI0, due: hari(3) };
    const p = sesiPilihan(baru({ ks: { [semua[0]!]: jadwalBesok } }), semua.slice(0, 12));
    expect(p.quiz.length).toBe(10);
    expect(p.quiz.map((x) => x.k).sort()).toEqual(semua.slice(0, 10).sort());
    expect(p.write).toEqual([]);
  });

  it("jenis soal bergiliran mengikuti hitungan: arti, bacaan, rakit, lalu ulang", () => {
    const jenis = [0, 1, 2, 3, 4, 5].map((count) => {
      const ks = { [K]: { seen: true, vi: 0, count, wrongStreak: 0, everCorrect: true, lastSeen: hari(-1), due: HARI0 } };
      return buildSession(baru({ ks, lastAcc: 0.6 }), HARI0).quiz[0]!.type;
    });
    expect(jenis).toEqual(["meaning", "reading", "rakit", "meaning", "reading", "rakit"]);
  });

  it("sesi murid baru (semua kanji hitungan 0) tetap bergiliran, tidak satu jenis saja", () => {
    const p = buildSession(baru({ tg: "N5", lastAcc: null }), HARI0);
    expect(new Set(p.quiz.map((x) => x.type)).size).toBeGreaterThan(1);
  });

  it("kata tidak tampil dua kali dalam satu sesi walau dua kanji berbeda berbagi kata yang sama (mis. 学生)", () => {
    const semua = aktif({ tg: "N1" }).map((x) => x.kanji);
    const jadi = (count: number) => ({ seen: true, vi: 0, count, wrongStreak: 0, everCorrect: true, lastSeen: hari(-1), due: HARI0 });
    const ks = Object.fromEntries(semua.slice(0, 60).map((k) => [k, jadi(2)]));
    const p = buildSession(baru({ tg: "N1", ks, lastAcc: 0.8 }), HARI0);
    const kata = p.quiz.map((x) => x.kata);
    expect(new Set(kata).size).toBe(kata.length);
  });
});

describe("penjaga data (kanji-gabungan.json)", () => {
  it("soal rakit tidak pernah memakai kosakata seg_valid: false", () => {
    for (const x of KANJI) {
      if (!bisaRakit(x.kanji)) continue;
      for (let vi = 0; vi < x.kosakata.length; vi++) {
        const v = KAMUS[kosakataUntuk(x.kanji, vi, true)]!;
        expect(v.seg_valid).toBe(true);
        expect(v.seg.some((s) => s[0] === x.kanji)).toBe(true);
      }
    }
  });

  it("kosakata tanpa arti tidak pernah dijadikan soal", () => {
    for (const x of KANJI) {
      for (let vi = 0; vi < x.kosakata.length; vi++) {
        expect(KAMUS[kosakataUntuk(x.kanji, vi, false)]!.arti).not.toBe("");
      }
    }
  });

  it("kanji tanpa kosakata yang bisa dirakit (叔, 綿) dilatih lewat soal arti/bacaan", () => {
    for (const k of ["叔", "綿"]) {
      expect(bisaRakit(k)).toBe(false);
      for (const count of [0, 1, 2, 3, 4]) {
        const ks = { [k]: { seen: true, vi: 0, count, wrongStreak: 0, everCorrect: true, lastSeen: hari(-1), due: HARI0 } };
        const p = buildSession(baru({ tg: "N1", ks, lastAcc: 0.6 }), HARI0);
        const it = p.quiz.find((x) => x.k === k)!;
        expect(it.type).not.toBe("rakit");
      }
      const p = buildSession(baru({ tg: "N1" }), HARI0); // status putih
      for (const it of p.quiz) if (it.k === k) expect(it.type).not.toBe("rakit");
    }
  });

  it("setiap kanji aktif punya kosakata layak; distraktor tidak memuat kanji itu sendiri", () => {
    expect(aktif({ tg: "N1" }).length).toBe(KANJI.filter((x) => bisaDipelajari(x.kanji)).length);
    for (const x of KANJI) {
      expect(x.distraktor).not.toContain(x.kanji);
      expect(KMAP[x.kanji]).toBe(x);
    }
  });
});

describe("kekuatan hijau (pudarnya warna = retrievability)", () => {
  it("mengembalikan retrievability asli, tanpa batas bawah visual", () => {
    let d = baru();
    for (let i = 0; i < 5; i++) d = applyAnswer(d, K, true, hari(i));
    d = applyWrite(d, K, true, hari(5));
    const s = d.ks[K]!;
    expect(greenStrength(s, hari(5))).toBeCloseTo(1, 5);
    expect(greenStrength(s, hari(2000))).toBeLessThan(0.35);
  });
  it("data lama tanpa lastReview tidak membuat perhitungan gagal", () => {
    const s = { seen: true, vi: 0, count: 0, wrongStreak: 0, green: true, S: 10 };
    expect(Number.isFinite(greenStrength(s, hari(3)))).toBe(true);
  });
});

describe("FSRS v4.5: rumus dan batas jarak", () => {
  it("kesulitan bergerak ke D0(3), bukan D0(4) (D0(4) baru di FSRS-5)", () => {
    // rating Good (3) pada D = D0(3): reversi ke rata-rata tidak menggeser kesulitan
    expect(nextD(D0(3), 3)).toBeCloseTo(D0(3), 10);
    // D lebih tinggi ditarik turun menuju D0(3)
    expect(nextD(8, 3)).toBeCloseTo(W[7] * D0(3) + (1 - W[7]) * 8, 10);
  });

});

describe("sesi (metode 1 dan 7)", () => {
  it("kanji yang baru mencapai benar ke-5 langsung masuk daftar tulis", () => {
    // Sesi.tsx menghitung ulang daftar tulis sesudah kuis, jadi kanji ini ditulis di sesi yang sama.
    let d = baru();
    for (let i = 0; i < 4; i++) d = applyAnswer(d, K, true, HARI0);
    expect(daftarTulis(d)).not.toContain(K);
    d = applyAnswer(d, K, true, HARI0);
    expect(daftarTulis(d)).toContain(K);
  });

  it("daftar tulis dibatasi TULIS_MAKS per sesi, yang paling lama menunggu di depan", () => {
    const k = aktif({ tg: "N5" }).slice(0, 8).map((x) => x.kanji);
    const ks = Object.fromEntries(k.map((x, i) => [x, {
      seen: true, vi: 0, count: 5, wrongStreak: 0, everCorrect: true, readyWrite: true, seq: 8 - i,
    }]));
    const daftar = daftarTulis(baru({ tg: "N5", ks }));
    expect(daftar.length).toBe(TULIS_MAKS);
    expect(daftar).toEqual([...k].reverse().slice(0, TULIS_MAKS)); // seq terkecil = paling lama menunggu
  });

  it("sesi yang diulang di hari yang sama menuntaskan kanji sampai soal tulis", () => {
    // Inilah yang dulu mustahil: hitungan mandek di 4 karena kanji yang hampir lulus
    // selalu di belakang antrean (due paling jauh) dan kanji baru terus ditambahkan.
    let d = baru({ tg: "N5" });
    for (let s = 0; s < 5; s++) {
      for (const it of buildSession(d, HARI0).quiz) d = applyAnswer(d, it.k, true, HARI0);
    }
    expect(daftarTulis(d).length).toBe(TULIS_MAKS);
    // antrean tidak membengkak: kanji yang belum hijau tetap maksimum satu sesi penuh
    expect(Object.values(d.ks).filter((x) => x.seen && !x.green).length).toBe(PROSES_MAKS);
  });
});

describe("kosakata mengikuti tingkat murid", () => {
  it("kanji N5 tidak dilatih lewat kosakata yang memuat kanji N1 (木 → bukan 木綿)", () => {
    for (let vi = 0; vi < 6; vi++) expect(kosakataUntuk("木", vi, false, undefined, "N5")).not.toBe("木綿");
    expect(kosakataUntuk("木", 0, false, undefined, "N5")).toBe("木曜日");
  });

  it("kosakata tiap kanji diurutkan dari yang termudah", () => {
    expect(KMAP["木"]!.kosakata[0]).toBe("木曜日");
    expect(KMAP["木"]!.kosakata.slice(0, 2)).toEqual(["木曜日", "木星"]); // 木綿 & 樹木 (N1) di belakang
  });

  it("kanji tidak dilatih lewat kata yang menyeret banyak kanji di atas tingkatnya (国 → bukan 国際交流)", () => {
    // 国際交流 setingkat N4 menurut kanji-kanjinya, tapi tiga dari empat kanjinya (際交流)
    // ada di atas 国 (N5): sebagai soal untuk 国 kata itu terlalu tinggi.
    for (const tg of ["N5", "JFT"] as const) {
      expect(kosakataUntuk("国", 0, false, undefined, tg)).toBe("外国");
      expect(kosakataUntuk("人", 0, false, undefined, tg)).not.toBe("人為的");
    }
    expect(KMAP["国"]!.kosakata.indexOf("外国")).toBeLessThan(KMAP["国"]!.kosakata.indexOf("国際交流"));
    // kanji JFT 流 memang tidak punya kata lain setingkatnya: 国際交流 tetap boleh dipakai
    expect(kosakataUntuk("流", 0, false, undefined, "JFT")).toBe("国際交流");
  });

  it("kata utuh dipakai lebih dulu daripada kanji telanjang (足 → 足, karena 満足 memuat kanji JFT)", () => {
    expect(kosakataUntuk("車", 0, false, undefined, "N5")).toBe("電車"); // 電 juga N5
    expect(kosakataUntuk("足", 0, false, undefined, "N5")).toBe("足"); // 満 di atas N5
    expect(kosakataUntuk("店", 0, false, undefined, "N5")).not.toBe("～店");
  });

  it("setiap kanji tetap punya kosakata di tingkat N5", () => {
    for (const x of KANJI.filter((x) => bisaDipelajari(x.kanji))) {
      expect(() => kosakataUntuk(x.kanji, 0, false, undefined, "N5")).not.toThrow();
      if (bisaRakit(x.kanji)) expect(() => kosakataUntuk(x.kanji, 0, true, undefined, "N5")).not.toThrow();
    }
  });
});

describe("batas jarak FSRS", () => {
  it("jarak maksimum tetap 180 hari (target ujian dihapus)", () => {
    expect(jarakHari(10_000)).toBe(180);
    expect(jarakHari(W[3])).toBeGreaterThanOrEqual(1);
  });
});
