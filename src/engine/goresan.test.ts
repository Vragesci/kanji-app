import { describe, expect, it } from "vitest";
import N5 from "../../public/goresan/N5.json";
import JFT from "../../public/goresan/JFT.json";
import N3 from "../../public/goresan/N3.json";
import N2 from "../../public/goresan/N2.json";
import N1 from "../../public/goresan/N1.json";
import { KANJI } from "../data/katalog";
import { nilaiTulisan, pesanKoreksi, sampelJalur, type Goresan } from "./goresan";

const semua: Record<string, string[]> = { ...N5, ...JFT, ...N3, ...N2, ...N1 };
let seed = 11;
const acak = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => Math.sqrt(-2 * Math.log(acak() + 1e-9)) * Math.cos(2 * Math.PI * acak());

/** tulisan tiruan: tiap goresan meleset ±4% ukuran kanji, bergetar, sedikit miring, ukuran & posisi kanvas acak */
function tiru(jalur: string[]): Goresan[] {
  const s = 3 + acak() * 2, tx = acak() * 60, ty = acak() * 60, r = gauss() * 0.06;
  const sx = 1 + gauss() * 0.06, sy = 1 + gauss() * 0.06;
  return jalur.map((d) => {
    const ox = gauss() * 4, oy = gauss() * 4;
    return sampelJalur(d, 8 + Math.floor(acak() * 30)).map(([x, y]) => {
      const X = (x - 54) * sx + ox + gauss() * 1.2, Y = (y - 54) * sy + oy + gauss() * 1.2;
      return [(X * Math.cos(r) - Y * Math.sin(r)) * s + tx, (X * Math.sin(r) + Y * Math.cos(r)) * s + ty] as [number, number];
    });
  });
}
const uji = Object.keys(semua).filter((_, i) => i % 5 === 0);
/** indeks goresan terpanjang: yang paling terasa kalau dipendekkan */
const terpanjang = (j: string[]): number => {
  const p = j.map((d) => { const q = sampelJalur(d, 2); return Math.hypot(q[1]![0] - q[0]![0], q[1]![1] - q[0]![1]); });
  return p.indexOf(Math.max(...p));
};
const persen = (f: (k: string) => boolean | null) => {
  const h = uji.map(f).filter((x) => x !== null);
  return h.filter(Boolean).length / h.length;
};

describe("pengecekan tulisan per goresan (KanjiVG)", () => {
  it("setiap kanji di data punya jalur goresan", () => {
    for (const x of KANJI) expect(semua[x.kanji]?.length, x.kanji).toBeGreaterThan(0);
  });

  it("tulisan yang benar (dengan meleset wajar) diterima", () => {
    expect(persen((k) => nilaiTulisan(tiru(semua[k]!), semua[k]!).ok)).toBeGreaterThanOrEqual(0.95);
  });

  it("dua goresan berurutan yang ditukar ditolak", () => {
    expect(persen((k) => {
      const j = semua[k]!;
      if (j.length < 2) return null;
      const g = tiru(j);
      const i = Math.floor(acak() * (j.length - 1));
      [g[i], g[i + 1]] = [g[i + 1]!, g[i]!];
      return !nilaiTulisan(g, j).ok;
    })).toBeGreaterThanOrEqual(0.95);
  });

  it("goresan panjang yang arahnya terbalik ditolak (titik seperti 丶 tidak dinilai arahnya)", () => {
    expect(persen((k) => {
      const j = semua[k]!;
      const panjang = j.map((d) => { const p = sampelJalur(d, 2); return Math.hypot(p[1]![0] - p[0]![0], p[1]![1] - p[0]![1]); });
      const i = panjang.indexOf(Math.max(...panjang));
      const g = tiru(j);
      g[i] = [...g[i]!].reverse();
      return !nilaiTulisan(g, j).ok;
    })).toBeGreaterThanOrEqual(0.98);
  });

  // 2026-11-02: dilaporkan murid — tulisan yang goresannya jauh terlalu pendek dinilai benar.
  // Bentuk dibandingkan setelah titik tengah kedua goresan disamakan, jadi goresan separuh
  // panjang hanya meleset sedikit di tiap titik. Panjang bentangannya kini ikut diperiksa.
  it("goresan yang panjangnya separuh ditolak", () => {
    expect(persen((k) => {
      const j = semua[k]!;
      const g = tiru(j);
      const i = terpanjang(j);
      g[i] = g[i]!.slice(0, Math.max(2, Math.ceil(g[i]!.length / 2)));
      return !nilaiTulisan(g, j).ok;
    })).toBeGreaterThanOrEqual(0.95);
  });

  it("goresan yang panjangnya seperempat ditolak", () => {
    expect(persen((k) => {
      const j = semua[k]!;
      const g = tiru(j);
      const i = terpanjang(j);
      g[i] = g[i]!.slice(0, Math.max(2, Math.ceil(g[i]!.length / 4)));
      return !nilaiTulisan(g, j).ok;
    })).toBeGreaterThanOrEqual(0.98);
  });

  it("goresan yang terlalu pendek diberi tahu sebagai masalah panjang, bukan 'bentuk'", () => {
    const j = semua["十"]!; // dua goresan panjang, lurus, saling tegak lurus
    const g = tiru(j);
    g[0] = g[0]!.slice(0, Math.max(2, Math.ceil(g[0]!.length / 2)));
    const h = nilaiTulisan(g, j);
    expect(h).toMatchObject({ ok: false, jenis: "panjang", ke: 1, terlalu: "pendek" });
    expect(pesanKoreksi(h)).toContain("terlalu pendek");
  });

  it("kanji lain dengan jumlah goresan sama ditolak", () => {
    const per: Record<number, string[]> = {};
    for (const k of Object.keys(semua)) (per[semua[k]!.length] ??= []).push(k);
    expect(persen((k) => {
      const lain = per[semua[k]!.length]!.filter((x) => x !== k);
      if (!lain.length) return null;
      return !nilaiTulisan(tiru(semua[lain[Math.floor(acak() * lain.length)]!]!), semua[k]!).ok;
    })).toBeGreaterThanOrEqual(0.98);
  });

  it("pesan koreksi yang jelas", () => {
    const j = semua["三"]!;
    const g = tiru(j);
    expect(pesanKoreksi(nilaiTulisan(g.slice(0, 2), j))).toBe("Jumlah goresanmu 2, seharusnya 3.");
    expect(nilaiTulisan([g[1]!, g[0]!, g[2]!], j)).toMatchObject({ ok: false, jenis: "urutan", ke: 1, mirip: 2 });
    const h = tiru(semua["人"]!);
    expect(nilaiTulisan([[...h[0]!].reverse(), h[1]!], semua["人"]!)).toMatchObject({ ok: false, jenis: "arah", ke: 1 });
  });
});
