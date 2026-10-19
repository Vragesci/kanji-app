import { describe, expect, it } from "vitest";
import { KANJI, bisaDipelajari } from "../data/katalog";
import { KOSONG } from "../db/penyimpanan";
import type { AppData } from "../types";
import { CEK_MAKS, TULIS_MAKS, buildSession, daftarTulis } from "./sesi";
import { statusOf } from "./fsrs";
import { applyWrite } from "./penilaian";
import { nilaiPenempatan, sesiPenempatan, tandaiLulusTes, tandaiSudahTahu, tingkatBawah } from "./penempatan";

const T = "2026-10-16";
const baru = (o: Partial<AppData> = {}): AppData => ({ ...KOSONG, ...o });
const jumlah = (tg: string) => KANJI.filter((x) => x.tingkat === tg && bisaDipelajari(x.kanji)).length;

describe("tes penempatan", () => {
  it("murid N5 tidak mendapat tes; murid N3 diuji di N5 dan JFT", () => {
    expect(tingkatBawah(baru({ tg: "N5" }))).toEqual([]);
    expect(tingkatBawah(baru({ tg: "N3" }))).toEqual(["N5", "JFT"]);
    const soal = sesiPenempatan(baru({ tg: "N3" }));
    expect(soal.length).toBe(20);
    expect(soal.every((s) => s.type !== "rakit")).toBe(true);
    expect(new Set(soal.map((s) => s.k)).size).toBe(20);
  });

  it("tingkat yang lulus: semua kanji putihnya hijau, yang salah jadi merah", () => {
    const d = baru({ tg: "N3" });
    const soal = sesiPenempatan(d);
    const jawab: Record<string, boolean> = {};
    soal.forEach((s, i) => { jawab[s.k] = s.tingkat === "N5" ? i !== 0 : false; }); // N5: 9/10, JFT: 0/10
    const { data, hasil } = nilaiPenempatan(d, soal, jawab, T);
    const n5 = hasil.find((h) => h.tingkat === "N5")!;
    const jft = hasil.find((h) => h.tingkat === "JFT")!;
    expect(n5.lulus).toBe(true);
    expect(jft.lulus).toBe(false);
    expect(n5.ditandai).toBe(jumlah("N5") - 1);
    expect(statusOf(data.ks[soal[0]!.k])).toBe("red");
    // JFT tidak lulus: hanya kanji yang diujikan berubah, sisanya tetap putih
    expect(KANJI.filter((x) => x.tingkat === "JFT" && data.ks[x.kanji]).length).toBe(10);
    expect(tingkatBawah(data)).toEqual(["JFT"]);
  });

  it("jadwal ulangan kanji yang ditandai tersebar, tidak jatuh tempo bersamaan", () => {
    let d = baru({ tg: "N3" });
    const k = KANJI.filter((x) => x.tingkat === "N5").map((x) => x.kanji);
    k.forEach((x, i) => { d = tandaiLulusTes(d, x, T, i); });
    const due = new Set(k.map((x) => d.ks[x]!.due));
    expect(due.size).toBeGreaterThan(50);
    expect(buildSession(d, T).quiz.every((it) => statusOf(d.ks[it.k]) !== "green")).toBe(true);
  });
});

describe('tombol "Sudah tahu kanji ini" (2026-10-19)', () => {
  const K = "先"; // kanji N5

  it("tidak langsung hijau: kanji menunggu pengecekan lewat sesi menulis", () => {
    const d = tandaiSudahTahu(baru(), K, T);
    expect(d.ks[K]!.green).toBeFalsy();
    expect(d.ks[K]!.readyWrite).toBe(true);
    expect(d.ks[K]!.count).toBe(5);
    expect(statusOf(d.ks[K])).toBe("orange");
    expect(daftarTulis(d)).toContain(K);
    // kanji yang menunggu ditulis tidak ikut ditanyakan lagi di kuis
    expect(buildSession(d, T).quiz.some((it) => it.k === K)).toBe(false);
  });

  it("tulisannya benar → hijau; belum benar → dipelajari dari awal", () => {
    const d = tandaiSudahTahu(baru(), K, T);
    const lulus = applyWrite(d, K, true, T);
    expect(statusOf(lulus.ks[K])).toBe("green");
    expect(lulus.ks[K]!.tahu).toBe(false);

    const gagal = applyWrite(d, K, false, T);
    expect(statusOf(gagal.ks[K])).toBe("red");
    expect(gagal.ks[K]!.readyWrite).toBe(false);
    expect(gagal.ks[K]!.count).toBe(0);
    expect(daftarTulis(gagal)).not.toContain(K);
    expect(buildSession(gagal, T).quiz.some((it) => it.k === K)).toBe(true);
  });
});

describe("cek tulis sesudah tes penempatan (2026-10-19)", () => {
  const n5 = () => KANJI.filter((x) => x.tingkat === "N5" && bisaDipelajari(x.kanji)).map((x) => x.kanji);

  it("kanji yang lulus tetap hijau, tapi menunggu cek tulis", () => {
    let d = baru({ tg: "N3" });
    n5().forEach((k, i) => { d = tandaiLulusTes(d, k, T, i); });
    const k0 = n5()[0]!;
    expect(statusOf(d.ks[k0])).toBe("green");
    expect(d.ks[k0]!.readyWrite).toBe(true);
    expect(d.ks[k0]!.tahu).toBe(true);
    // ratusan kanji menunggu, tapi satu sesi hanya mengecek CEK_MAKS
    expect(daftarTulis(d).length).toBe(CEK_MAKS);
    // kanji hijau yang belum jatuh tempo tidak ikut ditanyakan di kuis
    expect(buildSession(d, T).quiz.every((it) => statusOf(d.ks[it.k]) !== "green")).toBe(true);
  });

  it("cek tulis benar: tanda ceknya lepas, jadwal FSRS tidak berubah", () => {
    let d = baru({ tg: "N3" });
    const k = n5()[0]!;
    d = tandaiLulusTes(d, k, T, 0);
    const jadwal = { S: d.ks[k]!.S, due: d.ks[k]!.due, interval: d.ks[k]!.interval };
    const lulus = applyWrite(d, k, true, T);
    expect(statusOf(lulus.ks[k])).toBe("green");
    expect(lulus.ks[k]!.readyWrite).toBe(false);
    expect(lulus.ks[k]!.tahu).toBe(false);
    expect({ S: lulus.ks[k]!.S, due: lulus.ks[k]!.due, interval: lulus.ks[k]!.interval }).toEqual(jadwal);
    expect(daftarTulis(lulus)).not.toContain(k);
  });

  it("cek tulis gagal: kanji kehilangan status hijau dan dipelajari dari awal", () => {
    let d = baru({ tg: "N3" });
    const k = n5()[0]!;
    d = tandaiLulusTes(d, k, T, 0);
    const gagal = applyWrite(d, k, false, T);
    expect(statusOf(gagal.ks[k])).toBe("red");
    expect(gagal.ks[k]!.green).toBe(false);
    expect(gagal.ks[k]!.readyWrite).toBe(false);
    expect(gagal.ks[k]!.count).toBe(0);
    expect(buildSession(gagal, T).quiz.some((it) => it.k === k)).toBe(true);
  });

  it("kanji yang dituntaskan murid didahulukan atas cek tes penempatan", () => {
    let d = baru({ tg: "N3" });
    n5().forEach((k, i) => { d = tandaiLulusTes(d, k, T, i); });
    // empat kanji JFT yang baru lolos hitungan benar 5 kali
    const jft = KANJI.filter((x) => x.tingkat === "JFT" && bisaDipelajari(x.kanji)).slice(0, 4).map((x) => x.kanji);
    const ks = { ...d.ks };
    jft.forEach((k, i) => {
      ks[k] = { seen: true, vi: 0, count: 5, wrongStreak: 0, everCorrect: true, readyWrite: true, seq: 1000 + i };
    });
    const daftar = daftarTulis({ ...d, ks });
    expect(daftar.slice(0, 4)).toEqual(jft); // yang belum hijau lebih dulu
    expect(daftar.length).toBe(TULIS_MAKS); // sisa satu slot untuk cek tes penempatan
    expect(statusOf(ks[daftar[4]!])).toBe("green");
  });
});
