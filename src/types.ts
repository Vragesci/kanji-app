export type Tingkat = "N5" | "JFT" | "N3" | "N2" | "N1";

/** [huruf, bacaan]; kana okurigana punya bacaan kosong */
export type Seg = [string, string];

export interface Kosakata {
  kana: string;
  romaji: string;
  arti: string;
  seg: Seg[];
  /** false = bacaan khusus (今日, 大人): jangan dipecah, lewati untuk soal rakit */
  seg_valid: boolean;
  tingkat: Tingkat;
  level?: string;
  bab?: number;
  sumber?: string;
}

export interface Kanji {
  kanji: string;
  tingkat: Tingkat;
  level?: string;
  bab?: number;
  kosakata: string[];
  bacaan: string[];
  distraktor: string[];
}

export interface BerkasData {
  meta: Record<string, unknown>;
  kanji: Kanji[];
  kosakata: Record<string, Kosakata>;
}

/** Status per kanji. Semua tanggal berbentuk "YYYY-MM-DD" waktu lokal. */
export interface KanjiState {
  seen: boolean;
  lastSeen?: string;
  /** indeks kosakata yang sedang dipakai; bertambah saat pertemuan berikutnya / salah 3x */
  vi: number;
  /** jumlah jawaban benar berturut-turut di fase belajar (5 → sesi menulis); salah sekali → nol */
  count: number;
  wrongStreak: number;
  everCorrect?: boolean;
  readyWrite?: boolean;
  /**
   * Nomor jawaban terakhir (AppData.seq). Dipakai antrean sesi untuk bergilir: kanji yang paling
   * lama tidak dilatih didahulukan. Perlu nomor, bukan tanggal, karena sesi boleh diulang
   * berkali-kali dalam sehari dan semuanya bertanggal sama.
   */
  seq?: number;
  /** murid menekan "Sudah tahu kanji ini": menunggu pengecekan lewat sesi menulis */
  tahu?: boolean;
  salahTotal?: number;
  due?: string;
  green?: boolean;
  // fase FSRS (setelah hijau)
  S?: number;
  D?: number;
  interval?: number;
  lastReview?: string;
  lapsed?: boolean;
  lapses?: number;
}

export interface LogSesi {
  /** tanggal sesi */
  d: string;
  /** jumlah kanji yang dinilai */
  n: number;
  /** ketepatan percobaan pertama, 0..1 */
  acc: number;
}

export interface AppData {
  ks: Record<string, KanjiState>;
  /** penghitung jawaban yang terus naik; dipakai KanjiState.seq untuk urutan antrean */
  seq: number;
  /** hari yang dimajukan lewat alat uji guru */
  offset: number;
  lastAcc: number | null;
  log: LogSesi[];
  /** tingkat tertinggi yang aktif; semua tingkat di bawahnya ikut */
  tg: Tingkat;
}

export type JenisSoal = "meaning" | "reading" | "rakit";
export type ModeSesi = "learn" | "pilih" | "tes";

export interface ItemSoal {
  k: string;
  type: JenisSoal;
  /** kata yang dipakai untuk soal ini, ditentukan saat sesi dirakit (lihat kosakataUntuk) */
  kata: string;
}

export interface RencanaSesi {
  quiz: ItemSoal[];
  write: string[];
}
