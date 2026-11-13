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
  /** jumlah hari berbeda dengan jawaban benar berturut-turut (fase belajar) */
  count: number;
  wrongStreak: number;
  everCorrect?: boolean;
  /** tanggal terakhir kanji ini naik satu tingkat (jawaban benar atau lulus sesi menulis) */
  naikPada?: string;
  lastCountDay?: string;
  readyWrite?: boolean;
  /** berapa kali sesi menulis kanji ini belum lolos; dipakai membuka jalan keluar dari sesi tulis */
  gagalTulis?: number;
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
  /** hari yang dimajukan lewat alat uji guru */
  offset: number;
  lastAcc: number | null;
  log: LogSesi[];
  /** tingkat tertinggi yang aktif; semua tingkat di bawahnya ikut */
  tg: Tingkat;
  /** tingkat yang tes penempatannya sudah pernah diikuti (lulus atau tidak); tes hanya sekali per tingkat */
  tesSelesai?: Tingkat[];
  /**
   * Saklar "Bantu tingkatkan aplikasi ini" (Tahap 1b, 2026-11-09). Belum pernah disentuh =
   * undefined = mencatat; `false` mematikan pencatatan dan menghapus yang sudah tercatat.
   */
  rekam?: boolean;
  /** Efek suara dan getar (2026-11-13). Belum pernah disentuh = undefined = menyala. */
  suara?: boolean;
}

/** Alasan pengecek goresan menolak tulisan; sama dengan `Hasil.jenis` di engine/goresan.ts. */
export type AlasanTolak = "jumlah" | "arah" | "urutan" | "panjang" | "bentuk";

/**
 * Satu peristiwa belajar (Tahap 1b, 2026-11-09): satu baris per jawaban, disimpan di
 * IndexedDB di samping `LogSesi` yang tetap dipakai untuk beban sesi (`lastAcc`).
 * Anonim: tidak ada identitas murid dan tidak ada teks bebas.
 */
export interface Peristiwa {
  /** ISO waktu lokal */
  t: string;
  /** versi aplikasi — ini yang menjawab "murid pakai build lama?" */
  v: string;
  /** id sesi, acak per sesi, supaya bisa dilihat murid berhenti di soal mana */
  sid: string;
  kanji: string;
  /** kosakata yang dipakai saat itu */
  kata?: string;
  jenis: JenisSoal | "tulis";
  mode: ModeSesi;
  hasil: "benar" | "salah" | "lewat" | "sudahTahu" | "akuBenar";
  /** milidetik dari soal tampil sampai dijawab */
  ms: number;
  /** percobaan ke-n untuk kanji ini di sesi ini */
  ke: number;

  // khusus jenis "tulis"
  /** alasan pengecek goresan menolak */
  tolak?: AlasanTolak;
  /** goresan ke berapa yang ditolak */
  tolakKe?: number;
  /** jumlah goresan yang ditulis vs seharusnya (saat tolak === "jumlah") */
  ditulis?: number;
  seharusnya?: number;
  /** nilai gagalTulis dari KanjiState saat itu */
  gagal?: number;
  /** true kalau data goresan belum terunduh dan murid menilai sendiri */
  manual?: boolean;
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
