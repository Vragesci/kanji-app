import { describe, expect, it } from "vitest";
import { KANJI } from "../data/katalog";
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

  it("tingkat lebih rendah hanya menampilkan kanji sampai tingkat itu", () => {
    const n5 = kelompokkan(aktif({ tg: "N5" })).flatMap((g) => g.isi);
    expect(n5.every((x) => x.tingkat === "N5")).toBe(true);
    expect(n5.length).toBe(103);
  });
});
