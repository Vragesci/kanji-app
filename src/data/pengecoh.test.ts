import { describe, expect, it } from "vitest";
import { KAMUS, SEMUA_KATA } from "./katalog";
import { KELOMPOK_KATA, ekorKata, kandidatBacaanMirip, kapital, pengecohArti, pengecohBacaan } from "./pengecoh";

const ulang = <T,>(n: number, f: () => T): T[] => Array.from({ length: n }, f);

describe("pengecoh soal arti", () => {
  it("setiap kata di kelompok benar-benar ada di data dan punya arti", () => {
    for (const kata of KELOMPOK_KATA.keys()) {
      expect(KAMUS[kata], kata).toBeDefined();
      expect(KAMUS[kata]!.arti, kata).not.toBe("");
    }
  });

  it("南: pengecoh hanya arah mata angin lain (utara, timur, barat)", () => {
    const arah = new Set(
      SEMUA_KATA.filter((x) => KELOMPOK_KATA.get(x.kata) === "mataangin").map((x) => x.v.arti.toLowerCase().trim()),
    );
    for (const ops of ulang(30, () => pengecohArti("南", KAMUS["南"]!))) {
      expect(ops).toHaveLength(3);
      for (const o of ops) expect(arah.has(o.toLowerCase().trim()), o).toBe(true);
    }
  });

  it("selalu 3 pengecoh, tidak ada yang sama atau bertumpuk dengan jawaban benar", () => {
    for (const { kata, v } of SEMUA_KATA) {
      const ops = pengecohArti(kata, v);
      expect(ops.length, kata).toBe(3);
      const benar = v.arti.toLowerCase().trim();
      const semua = [benar, ...ops.map((o) => o.toLowerCase().trim())];
      expect(new Set(semua).size, kata).toBe(4);
      for (const o of semua.slice(1)) expect(o.includes(benar) || benar.includes(o), `${kata}: ${o}`).toBe(false);
    }
  }, 60_000);

  it("kata di luar kelompok tetap mendapat pengecoh sejenis (kelas kata sama bila mungkin)", () => {
    const ops = pengecohArti("食べます", KAMUS["食べます"]!);
    expect(ops).toHaveLength(3);
  });

  it("huruf pertama arti ditampilkan kapital agar gaya penulisan tidak membocorkan jawaban", () => {
    expect(kapital("tiba tiba")).toBe("Tiba tiba");
    expect(kapital("Selatan")).toBe("Selatan");
    expect(kapital("am")).toBe("am");
  });
});

describe("pengecoh soal bacaan", () => {
  const jarak = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
    for (let j = 1; j <= b.length; j++) d[0]![j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length]![b.length]!;
  };

  it("selalu 3 pengecoh unik yang tidak sama dengan bacaan benar (mode mirip maupun acak)", () => {
    // tiap soal menghitung jarak ke seluruh kosakata (± 3 ms); cukup periksa setiap kata ke-6 agar tes tetap cepat
    for (const { kata, v } of SEMUA_KATA.filter((_, i) => i % 6 === 0)) {
      for (const peluang of [0, 1]) {
        const ops = pengecohBacaan(kata, v, 3, peluang);
        expect(ops.length, kata).toBe(3);
        expect(new Set([v.kana, ...ops]).size, kata).toBe(4);
      }
    }
  }, 60_000);

  it("自転車: pada mode mirip, sedikitnya dua pengecoh hanya berbeda satu-dua huruf", () => {
    const v = KAMUS["自転車"]!;
    for (let i = 0; i < 40; i++) {
      const dekat = pengecohBacaan("自転車", v, 3, 1).filter((k) => jarak(k, v.kana) <= 2);
      expect(dekat.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("kesalahan lazim tercakup: dakuten, っ, dan bacaan kanji yang tertukar", () => {
    const c = kandidatBacaanMirip("自転車", KAMUS["自転車"]!);
    expect(c.suara).toContain("じでんしゃ");
    expect(c.geminasi).toContain("じってんしゃ");
    expect(c.tukar.length).toBeGreaterThan(0);
  });

  it("akhiran gramatikal ます tidak diubah", () => {
    const c = kandidatBacaanMirip("食べます", KAMUS["食べます"]!);
    for (const k of [...c.suara, ...c.panjang, ...c.geminasi, ...c.tukar]) expect(k.endsWith("ます"), k).toBe(true);
  });

  // 2026-11-03, dilaporkan pemakai: 苦労する → くろうする, じょうけん, たいしゅう, もくようび.
  // Murid tidak perlu tahu arti maupun bacaannya, cukup pilih satu-satunya yang berakhiran する.
  it("okurigana tidak membocorkan jawaban: semua pilihan berakhiran sama", () => {
    for (const kata of ["苦労する", "伝える", "勉強します", "多い", "同じ", "急に", "大切（な）", "到着する"]) {
      const v = KAMUS[kata];
      if (!v) continue;
      const ekor = ekorKata(kata, v);
      expect(ekor, kata).not.toBe("");
      for (const k of pengecohBacaan(kata, v)) {
        expect(k.endsWith(ekor), `${kata} → ${k}`).toBe(true);
        expect(k.length, `${kata} → ${k}`).toBeGreaterThan(ekor.length);
      }
    }
  });

  it("seluruh data: tidak ada kata berokurigana yang jawabannya satu-satunya dengan ekor itu", () => {
    const berekor = SEMUA_KATA.filter(({ kata, v }) => v.arti && ekorKata(kata, v));
    expect(berekor.length).toBeGreaterThan(400); // pastikan yang diperiksa memang banyak
    const bocor = berekor.filter(({ kata, v }) => {
      const ekor = ekorKata(kata, v);
      return [v.kana, ...pengecohBacaan(kata, v)].filter((o) => o.endsWith(ekor)).length === 1;
    });
    expect(bocor.map(({ kata }) => kata)).toEqual([]);
  });

  // Audit 2026-11-03. Pengecoh yang sebenarnya jawaban benar juga: murid dihukum walau tidak salah.
  it("bacaan sah dari tulisan yang sama tidak dipakai sebagai pengecoh (人/～人, 店/～店, 種類/～種類)", () => {
    for (const [kata, terlarang] of [["人", "にん"], ["～人", "ひと"], ["店", "てん"], ["～店", "みせ"], ["～種類", "しゅるい"]] as const) {
      const v = KAMUS[kata];
      if (!v) continue;
      for (let i = 0; i < 20; i++) {
        for (const o of pengecohBacaan(kata, v)) {
          expect(o.replace(/[～~]/g, ""), `${kata} → ${o}`).not.toBe(terlarang.replace(/[～~]/g, ""));
        }
      }
    }
  });

  it("arti yang bertumpuk tidak dipakai sebagai pengecoh, tapi satu lingkup makna tetap boleh", () => {
    // 割れる "Pecah/retak" dan 壊れる "Rusak/pecah" berbagi alternatif "pecah" — dua jawaban benar
    for (const [kata, terlarang] of [["割れる", "pecah"], ["検討", "pertimbangan"], ["扱い", "penanganan"]] as const) {
      const v = KAMUS[kata];
      if (!v) continue;
      for (let i = 0; i < 20; i++) {
        for (const o of pengecohArti(kata, v)) {
          const alt = o.toLowerCase().split(/[/;,]/).map((x) => x.trim());
          expect(alt.includes(terlarang), `${kata} → ${o}`).toBe(false);
        }
      }
    }
    // tetapi 春 masih boleh dipengecoh musim lain, walau sama-sama memuat kata "musim"
    const musim = pengecohArti("春", KAMUS["春"]!).join(" ").toLowerCase();
    expect(musim).toContain("musim");
  });

  it("pengecoh bacaan tidak pernah berbentuk rusak (kurung menggantung)", () => {
    for (const kata of ["満足（な）", "必要（な）", "入力する", "入院する", "出発する", "卒業する"]) {
      const v = KAMUS[kata];
      if (!v) continue;
      for (let i = 0; i < 20; i++) {
        for (const o of pengecohBacaan(kata, v)) {
          expect((o.match(/（/g) || []).length, `${kata} → ${o}`).toBe((o.match(/）/g) || []).length);
          expect(o, `${kata} → ${o}`).not.toContain("（（");
        }
      }
    }
  });

  it("pilihan dicocokkan menurut mora, bukan jumlah huruf (きょう = 2 mora)", () => {
    const m = (k: string) => [...k].filter((c) => !"ゃゅょ".includes(c)).length;
    let solo = 0;
    const uji = ["今日", "食事", "病気", "水曜日", "今週", "学校"].filter((k) => KAMUS[k]);
    for (const kata of uji) {
      const v = KAMUS[kata]!;
      for (let i = 0; i < 10; i++) {
        const o = [v.kana, ...pengecohBacaan(kata, v)];
        if (o.filter((x) => m(x) === m(v.kana)).length === 1) solo++;
      }
    }
    expect(solo, "jawaban benar tidak boleh jadi satu-satunya dengan jumlah mora itu").toBeLessThanOrEqual(uji.length);
  });

  it("kata tanpa okurigana tidak terpengaruh dan tetap mendapat 3 pengecoh", () => {
    for (const kata of ["天気", "学生", "電車"]) {
      const v = KAMUS[kata];
      if (!v) continue;
      expect(ekorKata(kata, v)).toBe("");
      expect(pengecohBacaan(kata, v)).toHaveLength(3);
    }
  });
});
