import { describe, expect, it } from "vitest";
import { KAMUS, SEMUA_KATA } from "./katalog";
import { KELOMPOK_KATA, kandidatBacaanMirip, kapital, pengecohArti, pengecohBacaan } from "./pengecoh";

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
});
