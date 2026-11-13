import { describe, expect, it } from "vitest";
import { PANGKAT, bintang, pangkatDari, rantai } from "./permainan";

describe("pangkat", () => {
  it("batasnya naik terus dan dimulai dari nol", () => {
    expect(PANGKAT[0]!.mulai).toBe(0);
    for (let i = 1; i < PANGKAT.length; i++) expect(PANGKAT[i]!.mulai).toBeGreaterThan(PANGKAT[i - 1]!.mulai);
  });
  it("murid baru adalah minarai dan belum punya kemajuan", () => {
    const p = pangkatDari(0);
    expect(p.kini.romaji).toBe("minarai");
    expect(p.nomor).toBe(1);
    expect(p.porsi).toBe(0);
    expect(p.kurang).toBe(25);
  });
  it("naik tepat di batas", () => {
    expect(pangkatDari(24).kini.romaji).toBe("minarai");
    expect(pangkatDari(25).kini.romaji).toBe("shinjin");
    const senpai = PANGKAT[2]!.mulai;
    expect(pangkatDari(senpai - 1).kini.romaji).toBe("shinjin");
    expect(pangkatDari(senpai).kini.romaji).toBe("senpai");
  });
  it("pangkat tertinggi tidak punya pangkat berikut", () => {
    const p = pangkatDari(PANGKAT[PANGKAT.length - 1]!.mulai + 5);
    expect(p.berikut).toBeNull();
    expect(p.porsi).toBe(1);
    expect(p.kurang).toBe(0);
  });
});

describe("bintang", () => {
  it("mengikuti ambang beban sesi", () => {
    expect(bintang(0.6)).toBe(1);
    expect(bintang(0.7)).toBe(2);
    expect(bintang(0.9)).toBe(2);
    expect(bintang(1)).toBe(3);
  });
});

describe("rantai harian", () => {
  const sesi = (d: string) => ({ d, n: 10, acc: 1 });
  it("nol tanpa riwayat", () => expect(rantai([], "2026-11-13")).toBe(0));
  it("menghitung hari berturut-turut sampai hari ini", () => {
    expect(rantai([sesi("2026-11-11"), sesi("2026-11-12"), sesi("2026-11-13"), sesi("2026-11-13")], "2026-11-13")).toBe(3);
  });
  it("hari ini belum bermain tidak memutus rantai", () => {
    expect(rantai([sesi("2026-11-11"), sesi("2026-11-12")], "2026-11-13")).toBe(2);
  });
  it("putus kalau kemarin kosong", () => {
    expect(rantai([sesi("2026-11-10"), sesi("2026-11-11")], "2026-11-13")).toBe(0);
  });
  it("melewati pergantian bulan", () => {
    expect(rantai([sesi("2026-10-31"), sesi("2026-11-01")], "2026-11-01")).toBe(2);
  });
});
