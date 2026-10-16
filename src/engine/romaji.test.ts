import { describe, expect, it } from "vitest";
import { keRomaji } from "./romaji";
import { KAMUS, kataTulis } from "../data/katalog";

describe("romaji & kata untuk sesi menulis", () => {
  it("kana ke romaji", () => {
    expect(keRomaji("せい")).toBe("sei");
    expect(keRomaji("にん")).toBe("nin");
    expect(keRomaji("じょう")).toBe("jou");
    expect(keRomaji("しゃ")).toBe("sha");
    expect(keRomaji("きょう")).toBe("kyou");
    expect(keRomaji("がっこう")).toBe("gakkou");
    expect(keRomaji("ちょっと")).toBe("chotto");
  });

  it("menulis 人 memakai kata 人 (ひと), bukan 何人", () => {
    expect(kataTulis("人", "N5")).toBe("人");
    expect(KAMUS[kataTulis("人", "N5")]!.kana).toBe("ひと");
  });
});
