import type { BerkasData, Kanji, Kosakata, Tingkat } from "../types";
import berkas from "./kanji-gabungan.json";

const data = berkas as unknown as BerkasData;

export const KANJI: Kanji[] = data.kanji;
export const KAMUS: Record<string, Kosakata> = data.kosakata;

export const TINGKAT: Tingkat[] = ["N5", "JFT", "N3", "N2", "N1"];
export const URUT: Record<Tingkat, number> = { N5: 0, JFT: 1, N3: 2, N2: 3, N1: 4 };

export const KSET = new Set(KANJI.map((x) => x.kanji));
export const KMAP: Record<string, Kanji> = Object.fromEntries(KANJI.map((x) => [x.kanji, x]));

// Kosakata tanpa arti (mis. 通過, 真ん中) tidak boleh dijadikan soal: arti tidak
// boleh dikarang, jadi dilewati sampai datanya dilengkapi dari JMdict.
export const layak = (kata: string): boolean => !!KAMUS[kata]?.arti;

/** kosakata cocok untuk soal rakit kanji `k`: bacaan bisa dipecah dan `k` berdiri sendiri sebagai segmen */
const cocokRakit = (kata: string, k: string): boolean => {
  const v = KAMUS[kata];
  return !!v && !!v.arti && v.seg_valid && v.seg.some((s) => s[0] === k);
};

export const bisaRakit = (k: string): boolean => KMAP[k]!.kosakata.some((w) => cocokRakit(w, k));

/** kanji yang punya sedikitnya satu kosakata layak; sisanya tidak diajukan */
export const bisaDipelajari = (k: string): boolean => KMAP[k]!.kosakata.some(layak);

/**
 * Kosakata untuk kanji `k` pada indeks `vi`. Kalau kata di indeks itu tidak layak
 * (arti kosong; atau, untuk rakit, bacaan khusus), maju ke kata berikutnya.
 */
export function kosakataUntuk(k: string, vi: number, untukRakit: boolean): string {
  const list = KMAP[k]!.kosakata;
  const ok = untukRakit ? (w: string) => cocokRakit(w, k) : layak;
  for (let i = 0; i < list.length; i++) {
    const w = list[(vi + i) % list.length]!;
    if (ok(w)) return w;
  }
  throw new Error(`Kanji ${k} tidak punya kosakata layak${untukRakit ? " untuk rakit" : ""}`);
}

/** kosakata layak, untuk membuat pengecoh soal arti dan bacaan */
export const SEMUA_KATA: { kata: string; v: Kosakata }[] = Object.entries(KAMUS)
  .filter(([, v]) => !!v.arti)
  .map(([kata, v]) => ({ kata, v }));

export const SEMUA_KANJI: string[] = KANJI.map((x) => x.kanji);
