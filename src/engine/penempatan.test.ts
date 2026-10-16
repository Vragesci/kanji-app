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
    k.forEach((x, i) => { d = tandaiSudahTahu(d, x, T, i); });
    const due = new Set(k.map((x) => d.ks[x]!.due));
    expect(due.size).toBeGreaterThan(50);
    expect(buildSession(d, T).quiz.every((it) => statusOf(d.ks[it.k]) !== "green")).toBe(true);
  });
});
