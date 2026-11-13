// Tampilan game (2026-11-13): pangkat, bintang sesi, dan rantai harian.
// Semuanya turunan dari data yang sudah ada (status hijau, ketepatan sesi, LogSesi);
// tidak ada yang mengubah metode belajar maupun jadwal.
import { KANJI, TINGKAT } from "../data/katalog";
import { statusOf } from "./fsrs";
import { addDays } from "./tanggal";
import type { AppData, LogSesi } from "../types";

export interface Pangkat {
  jp: string;
  romaji: string;
  arti: string;
  /** jumlah kanji hafal untuk mencapai pangkat ini */
  mulai: number;
}

/** jumlah kanji sampai akhir tiap tingkat, berurutan N5 → N1 (dihitung dari data, bukan ditulis tangan) */
const KUMULATIF: number[] = TINGKAT.map((_, i) => KANJI.filter((k) => TINGKAT.indexOf(k.tingkat) <= i).length);

/** Tujuh pangkat bertema jenjang tempat kerja di Jepang; batas pangkat 3–7 jatuh di akhir tiap tingkat. */
export const PANGKAT: Pangkat[] = [
  { jp: "見習い", romaji: "minarai", arti: "pemula", mulai: 0 },
  { jp: "新人", romaji: "shinjin", arti: "pendatang baru", mulai: 25 },
  { jp: "先輩", romaji: "senpai", arti: "senior", mulai: KUMULATIF[0]! },
  { jp: "班長", romaji: "hanchou", arti: "kepala regu", mulai: KUMULATIF[1]! },
  { jp: "職長", romaji: "shokuchou", arti: "mandor", mulai: KUMULATIF[2]! },
  { jp: "工場長", romaji: "koujouchou", arti: "kepala pabrik", mulai: KUMULATIF[3]! },
  { jp: "社長", romaji: "shachou", arti: "direktur", mulai: KUMULATIF[4]! },
];

/** jumlah kanji berstatus hijau di semua tingkat */
export const jumlahHafal = (data: AppData): number =>
  KANJI.reduce((n, k) => n + (statusOf(data.ks[k.kanji]) === "green" ? 1 : 0), 0);

export interface PosisiPangkat {
  kini: Pangkat;
  /** nomor pangkat, mulai dari 1 */
  nomor: number;
  berikut: Pangkat | null;
  /** 0..1 kemajuan menuju pangkat berikutnya (1 kalau sudah pangkat tertinggi) */
  porsi: number;
  /** kanji yang masih kurang untuk naik (0 kalau sudah pangkat tertinggi) */
  kurang: number;
}

export function pangkatDari(hafal: number): PosisiPangkat {
  let i = 0;
  while (i + 1 < PANGKAT.length && hafal >= PANGKAT[i + 1]!.mulai) i++;
  const kini = PANGKAT[i]!;
  const berikut = PANGKAT[i + 1] ?? null;
  if (!berikut) return { kini, nomor: i + 1, berikut, porsi: 1, kurang: 0 };
  const porsi = (hafal - kini.mulai) / (berikut.mulai - kini.mulai);
  return { kini, nomor: i + 1, berikut, porsi: Math.min(1, Math.max(0, porsi)), kurang: berikut.mulai - hafal };
}

/**
 * Bintang akhir sesi. Ambangnya sengaja sama dengan ambang beban sesi di brief (butir 6):
 * di bawah 70% satu, 70–90% dua, di atas 90% tiga.
 */
export const bintang = (acc: number): 1 | 2 | 3 => (acc > 0.9 ? 3 : acc >= 0.7 ? 2 : 1);

/**
 * Rantai harian: jumlah hari berturut-turut yang punya sesi, berakhir hari ini atau kemarin
 * (hari ini belum bermain tidak memutus rantai sampai harinya lewat).
 */
export function rantai(log: LogSesi[], t: string): number {
  const hari = new Set(log.map((x) => x.d));
  let ujung = hari.has(t) ? t : addDays(t, -1);
  let n = 0;
  while (hari.has(ujung)) { n++; ujung = addDays(ujung, -1); }
  return n;
}
