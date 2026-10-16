import type { BerkasData, Kanji, Kosakata, Tingkat } from "../types";
import berkas from "./kanji-gabungan.json";

const data = berkas as unknown as BerkasData;

export const KAMUS: Record<string, Kosakata> = data.kosakata;

export const TINGKAT: Tingkat[] = ["N5", "JFT", "N3", "N2", "N1"];
export const URUT: Record<Tingkat, number> = { N5: 0, JFT: 1, N3: 2, N2: 3, N1: 4 };

/** tingkat kanji, untuk menilai kesulitan kosakata */
const TINGKAT_KANJI: Record<string, number> = Object.fromEntries(data.kanji.map((x) => [x.kanji, URUT[x.tingkat]]));
/** kanji di luar katalog dianggap lebih sulit dari N1 */
const DI_LUAR = 5;
const isKanji = (c: string) => /[㐀-鿿豈-﫿]/.test(c);

/**
 * Kesulitan kosakata = tingkat tertinggi di antara kanji penyusunnya dan tingkat kata itu sendiri.
 * Contoh: 木綿 = N1 (karena 綿), 木曜日 = JFT (karena 曜). Dipakai supaya kanji N5 tidak dilatih
 * lewat kata yang memuat kanji N1.
 */
export function kesulitan(kata: string): number {
  let n = 0;
  for (const c of kata) if (isKanji(c)) n = Math.max(n, TINGKAT_KANJI[c] ?? DI_LUAR);
  const tk = KAMUS[kata]?.tingkat;
  if (tk && tk in URUT) n = Math.max(n, URUT[tk]);
  return n;
}

// Kosakata tiap kanji diurutkan dari yang paling mudah (urutan asli dipertahankan bila setara).
export const KANJI: Kanji[] = data.kanji.map((x) => ({
  ...x,
  kosakata: x.kosakata
    .map((w, i) => ({ w, i, s: kesulitan(w) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((o) => o.w),
}));

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
 * `hindari` (opsional): kata yang sudah dipakai kanji lain di sesi yang sama —
 * dilewati kalau ada pilihan lain, supaya kata yang sama tidak tampil dua kali
 * dalam satu sesi (mis. 学生 muncul lagi saat giliran kanji 生 setelah kanji 学).
 */
export function kosakataUntuk(
  k: string, vi: number, untukRakit: boolean, hindari?: Set<string>, tingkat: Tingkat = "N1",
): string {
  const semua = KMAP[k]!.kosakata;
  const cocok = untukRakit ? (w: string) => cocokRakit(w, k) : layak;
  // Utamakan kata yang semua kanjinya ada di tingkat pilihan murid. Kalau tidak ada,
  // pakai kata-kata termudah yang tersedia (mis. 木 di N5 → 木曜日, bukan 木綿).
  const mudah = semua.filter(cocok).reduce((m, w) => Math.min(m, kesulitan(w)), Infinity);
  const batas = Math.max(URUT[tingkat], mudah);
  const list = semua.filter((w) => kesulitan(w) <= batas);
  const ok = cocok;
  let cadangan: string | null = null;
  for (let i = 0; i < list.length; i++) {
    const w = list[(vi + i) % list.length]!;
    if (!ok(w)) continue;
    cadangan ??= w;
    if (!hindari?.has(w)) return w;
  }
  if (cadangan !== null) return cadangan; // semua pilihan sudah dipakai; lebih baik ulang daripada gagal
  throw new Error(`Kanji ${k} tidak punya kosakata layak${untukRakit ? " untuk rakit" : ""}`);
}

/** kosakata layak, untuk membuat pengecoh soal arti dan bacaan */
export const SEMUA_KATA: { kata: string; v: Kosakata }[] = Object.entries(KAMUS)
  .filter(([, v]) => !!v.arti)
  .map(([kata, v]) => ({ kata, v }));

export const SEMUA_KANJI: string[] = KANJI.map((x) => x.kanji);
