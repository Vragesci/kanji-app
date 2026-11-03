import { describe, expect, it } from "vitest";
import { KANJI, bisaDipelajari } from "../data/katalog";
import { KOSONG } from "../db/penyimpanan";
import type { AppData } from "../types";
import { buildSession } from "./sesi";
import { statusOf } from "./fsrs";
import { nilaiPenempatan, sesiPenempatan, tandaiSudahTahu, tingkatBawah } from "./penempatan";

const T = "2026-10-16";
const baru = (o: Partial<AppData> = {}): AppData => ({ ...KOSONG, ...o });
const jumlah = (tg: string) => KANJI.filter((x) => x.tingkat === tg && bisaDipelajari(x.kanji)).length;

describe("tes penempatan", () => {
  it("murid N5 tidak mendapat tes; murid N3 boleh menguji N5 atau JFT, satu tingkat per tes", () => {
    expect(tingkatBawah(baru({ tg: "N5" }))).toEqual([]);
    expect(tingkatBawah(baru({ tg: "N3" }))).toEqual(["N5", "JFT"]);
    const soal = sesiPenempatan(baru({ tg: "N3" }), "JFT");
    expect(soal.length).toBe(20);
    expect(soal.every((s) => s.tingkat === "JFT")).toBe(true); // tidak memborong tingkat lain
    expect(soal.every((s) => s.type !== "rakit")).toBe(true);
    expect(new Set(soal.map((s) => s.k)).size).toBe(20);
    // tingkat yang tidak ditawarkan (mis. N3 sendiri, atau tingkat yang sudah dites) tidak memberi soal
    expect(sesiPenempatan(baru({ tg: "N3" }), "N3")).toEqual([]);
    expect(sesiPenempatan(baru({ tg: "N3", tesSelesai: ["N5"] }), "N5")).toEqual([]);
  });

  it("tiap tingkat punya 20 soal penuh, berapa pun tingkat yang dipilih murid", () => {
    // dulu 20 soal dibagi rata ke semua tingkat bawah: murid N1 hanya dapat 5 soal per tingkat
    for (const tg of ["N3", "N2", "N1"] as const) {
      for (const bawahnya of tingkatBawah(baru({ tg }))) {
        expect(sesiPenempatan(baru({ tg }), bawahnya).length, `${tg}/${bawahnya}`).toBe(20);
      }
    }
  });

  it("tingkat yang lulus: semua kanji putihnya hijau, yang salah jadi merah", () => {
    const d = baru({ tg: "N3" });
    const soal = sesiPenempatan(d, "N5");
    const jawab: Record<string, boolean> = {};
    soal.forEach((s, i) => { jawab[s.k] = i !== 0; }); // 19/20
    const { data, hasil } = nilaiPenempatan(d, soal, jawab, T);
    const n5 = hasil.find((h) => h.tingkat === "N5")!;
    expect(n5.lulus).toBe(true);
    expect(n5.ditandai).toBe(jumlah("N5") - 1);
    expect(statusOf(data.ks[soal[0]!.k])).toBe("red");
    // hanya N5 yang tersentuh; JFT tetap putih seluruhnya dan masih boleh dites
    expect(KANJI.filter((x) => x.tingkat === "JFT" && data.ks[x.kanji]).length).toBe(0);
    expect(tingkatBawah(data)).toEqual(["JFT"]);
  });

  it("tes gagal: tingkat itu tidak bisa diulang, dipelajari seperti biasa", () => {
    const d = baru({ tg: "N3" });
    const soal = sesiPenempatan(d, "N5");
    const jawab = Object.fromEntries(soal.map((s) => [s.k, false]));
    const { data, hasil } = nilaiPenempatan(d, soal, jawab, T);
    expect(hasil[0]!.lulus).toBe(false);
    expect(data.tesSelesai).toContain("N5");
    expect(tingkatBawah(data)).toEqual(["JFT"]); // N5 tidak ditawarkan lagi
    expect(sesiPenempatan(data, "N5")).toEqual([]);
  });

  it("kanji hasil tes diulang dalam 1–3 minggu, bukan 1–3 bulan", () => {
    const d = baru({ tg: "N3" });
    const soal = sesiPenempatan(d, "N5");
    const { data } = nilaiPenempatan(d, soal, Object.fromEntries(soal.map((s) => [s.k, true])), T);
    const jarak = KANJI.filter((x) => x.tingkat === "N5" && data.ks[x.kanji]?.green).map((x) => data.ks[x.kanji]!.interval!);
    expect(Math.min(...jarak)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...jarak)).toBeLessThanOrEqual(21);
    expect(new Set(jarak).size).toBeGreaterThan(5); // tetap disebar, tidak jatuh tempo bersamaan
  });

  it("jadwal ulangan kanji yang ditandai tersebar, tidak jatuh tempo bersamaan", () => {
    let d = baru({ tg: "N3" });
    const k = KANJI.filter((x) => x.tingkat === "N5").map((x) => x.kanji);
    k.forEach((x, i) => { d = tandaiSudahTahu(d, x, T, i); });
    const due = new Set(k.map((x) => d.ks[x]!.due));
    expect(due.size).toBeGreaterThan(50);
    expect(buildSession(d, T).quiz.every((it) => statusOf(d.ks[it.k]) !== "green")).toBe(true);
  });
});
