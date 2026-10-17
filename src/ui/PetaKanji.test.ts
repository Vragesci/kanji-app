import { describe, expect, it } from "vitest";
import { KANJI } from "../data/katalog";
import type { KanjiState } from "../types";
import { aktif } from "../engine/sesi";
import { kelompokkan } from "./PetaKanji";

describe("peta kanji", () => {
  it("setiap kanji aktif muncul tepat satu kali di peta", () => {
    const semua = aktif({ tg: "N1" });
    const dipetakan = kelompokkan(semua).flatMap((g) => g.isi.map((x) => x.kanji));
    expect(dipetakan.length).toBe(semua.length);
    expect(new Set(dipetakan).size).toBe(semua.length);
    expect(semua.length).toBeGreaterThan(KANJI.length - 10);
  });

  it("kanji yang sudah dipelajari pindah ke kelompok paling atas, hijau dulu", () => {
    const semua = aktif({ tg: "N5" });
    const st = (x: Partial<KanjiState>): KanjiState => ({ seen: true, vi: 0, count: 0, wrongStreak: 0, ...x });
    const ks = {
      [semua[40]!.kanji]: st({}), // merah
      [semua[20]!.kanji]: st({ everCorrect: true, count: 2, due: "2026-10-20" }), // oranye
      [semua[60]!.kanji]: st({ everCorrect: true, green: true, count: 5, due: "2026-11-01", S: 10, D: 5 }),
    };
    const grup = kelompokkan(semua, ks);
    expect(grup[0]!.kunci).toBe("dipelajari");
    expect(grup[0]!.isi.map((x) => x.kanji)).toEqual([semua[60]!.kanji, semua[20]!.kanji, semua[40]!.kanji]);
    // tidak digandakan: kelompok lain hanya berisi kanji putih
    const sisa = grup.slice(1).flatMap((g) => g.isi.map((x) => x.kanji));
    expect(sisa).toHaveLength(semua.length - 3);
    expect(sisa.some((k) => k in ks)).toBe(false);
  });

  it("tanpa kemajuan, peta tidak punya kelompok tambahan", () => {
    expect(kelompokkan(aktif({ tg: "N5" }), {}).some((g) => g.kunci === "dipelajari")).toBe(false);
  });

  it("tingkat lebih rendah hanya menampilkan kanji sampai tingkat itu", () => {
    const n5 = kelompokkan(aktif({ tg: "N5" })).flatMap((g) => g.isi);
    expect(n5.every((x) => x.tingkat === "N5")).toBe(true);
    expect(n5.length).toBe(103);
  });
});
