import { describe, expect, it } from "vitest";
import { KAMUS, SEMUA_KATA } from "./katalog";
import { KELOMPOK_KATA, kapital, pengecohArti } from "./pengecoh";

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
  });

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
