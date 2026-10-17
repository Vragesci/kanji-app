import { describe, expect, it } from "vitest";
import { KANJI, KAMUS, tingkatKanjiKata, URUT } from "./katalog";
import { bacaanKanji, contohKata } from "./bacaan";

describe("detail kanji: bacaan dan contoh kata", () => {
  it("on-yomi dalam katakana, kun-yomi dengan okurigana", () => {
    const { on, kun } = bacaanKanji("生");
    expect(on.map((b) => b.tampil)).toEqual(["セイ", "ショウ"]);
    expect(on.every((b) => b.dipakai)).toBe(true); // 学生 せい, 誕生日 じょう (rendaku)
    const ikiru = kun.find((b) => b.tampil === "いきる")!;
    expect(ikiru).toMatchObject({ akar: "い", okuri: "きる", romaji: "ikiru" });
    expect(kun[0]!.dipakai).toBe(true); // yang dipakai di kosakata didahulukan
    const dipakai = kun.filter((b) => b.dipakai).map((b) => b.tampil);
    expect(dipakai).toContain("うまれる"); // 生まれる
    expect(dipakai).toContain("なま"); // 生
    expect(dipakai).not.toContain("うむ"); // tidak ada kata 生む di data
  });

  it("kanji yang bacaannya kosong di data aplikasi tetap punya bacaan (日, 国, 食)", () => {
    for (const k of ["日", "国", "食"]) {
      const { on, kun } = bacaanKanji(k);
      expect(on.length + kun.length, k).toBeGreaterThan(0);
    }
    expect(bacaanKanji("日").on.map((b) => b.tampil)).toContain("ニチ");
  });

  it("setiap kanji di data punya bacaan", () => {
    for (const x of KANJI) {
      const { on, kun } = bacaanKanji(x.kanji);
      expect(on.length + kun.length, x.kanji).toBeGreaterThan(0);
    }
  });

  it("contoh kata mengikuti tingkat pilihan murid", () => {
    const sei = contohKata("生", "N5");
    expect(sei.diAtas).toBe(false);
    for (const w of sei.kata) expect(tingkatKanjiKata(w)).toBeLessThanOrEqual(URUT.N5);
    expect(contohKata("生", "N1").kata.length).toBeGreaterThan(sei.kata.length);
    expect(sei.kata).toContain("学生"); // kosakata Irodori, tapi kedua kanjinya N5
    // 木 tidak punya kata yang semua kanjinya N5: tampil kata termudah saja (木曜日), bukan 木綿
    expect(contohKata("木", "N5")).toEqual({ kata: ["木曜日"], diAtas: true });
    for (const w of contohKata("生", "N5").kata) expect(KAMUS[w]!.arti).toBeTruthy();
  });

  it("kalau tidak ada kata setingkat, kata termudah ditampilkan dengan tanda", () => {
    const k = KANJI.find((x) => x.tingkat === "N1")!.kanji;
    const c = contohKata(k, "N5");
    expect(c.diAtas).toBe(true);
    expect(c.kata.length).toBeGreaterThan(0);
  });
});
