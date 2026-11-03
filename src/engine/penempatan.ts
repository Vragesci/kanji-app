import type { AppData, ItemSoal, KanjiState, Tingkat } from "../types";
import { KANJI, TINGKAT, URUT, bisaDipelajari, kosakataUntuk } from "../data/katalog";
import { sample } from "./acak";
import { D0, statusOf } from "./fsrs";
import { applyAnswer } from "./penilaian";
import { addDays } from "./tanggal";

/**
 * Tes penempatan (2026-10-16, dirombak 2026-11-03): murid yang sudah menguasai tingkat bawah
 * tidak perlu mengulang ratusan kanji yang sudah ia kuasai. 20 soal arti/bacaan diambil dari
 * kanji yang belum dilihat di SATU tingkat; ketepatan ≥ 80% (16 dari 20) menandai semua kanji
 * putih di tingkat itu sebagai hafal.
 *
 * Rombakan 2026-11-03, setelah murid melaporkan "baru 50 soal tapi sudah hafal 680 kanji":
 * dulu satu tes memborong semua tingkat di bawah pilihan murid dan membagi 20 soal rata, jadi
 * tingkat N4 yang isinya 311 kanji divonis oleh 6 soal pilihan ganda. Memilih "sampai N2" lalu
 * ikut tes 18 soal langsung menandai 689 kanji sebagai hafal. Tesnya juga bisa diulang tanpa
 * batas sampai lolos. Sekarang: satu tingkat per tes, 20 soal penuh, dan sekali saja per tingkat.
 */
export const TOTAL_SOAL = 20;
export const AMBANG_LULUS = 0.8;
/** tingkat dengan kanji putih lebih sedikit dari ini tidak ditawari tes (sampelnya tidak cukup) */
export const MIN_PUTIH = 10;
/** jadwal ulangan pertama kanji hasil tes penempatan: 7–21 hari (lihat tandaiSudahTahu) */
export const JARAK_TES = { mulai: 7, sebar: 15 };

/**
 * Tingkat di bawah pilihan murid yang masih bisa dites: masih punya cukup kanji belum dilihat
 * dan belum pernah dites. Gagal sekali berarti tingkat itu dipelajari seperti biasa — tanpa itu,
 * murid bisa mengulang tes sampai lolos karena menebak (5 soal: 29% lolos dalam 22 percobaan).
 */
export function tingkatBawah(data: Pick<AppData, "tg" | "ks" | "tesSelesai">): Tingkat[] {
  const batas = URUT[data.tg || "N5"];
  const selesai = new Set(data.tesSelesai || []);
  return TINGKAT.filter((tg) => URUT[tg] < batas && !selesai.has(tg) && putihDi(data, tg).length >= MIN_PUTIH);
}

/** berapa kanji yang akan ditandai hafal kalau tingkat ini lulus — ditampilkan sebelum tes dimulai */
export const jumlahPutih = (data: Pick<AppData, "ks">, tg: Tingkat): number => putihDi(data, tg).length;

const putihDi = (data: Pick<AppData, "ks">, tg: Tingkat): string[] =>
  KANJI.filter((x) => x.tingkat === tg && bisaDipelajari(x.kanji) && statusOf(data.ks[x.kanji]) === "white").map((x) => x.kanji);

export interface SoalPenempatan extends ItemSoal { tingkat: Tingkat }

/** 20 soal dari satu tingkat saja (atau sebanyak kanji putih yang tersisa, kalau kurang dari 20) */
export function sesiPenempatan(data: Pick<AppData, "tg" | "ks" | "tesSelesai">, tingkat: Tingkat): SoalPenempatan[] {
  if (!tingkatBawah(data).includes(tingkat)) return [];
  const dipakai = new Set<string>();
  return sample(putihDi(data, tingkat), TOTAL_SOAL).map((k, i) => {
    const type: SoalPenempatan["type"] = i % 2 === 0 ? "meaning" : "reading";
    const kata = kosakataUntuk(k, 0, false, dipakai, tingkat);
    dipakai.add(kata);
    return { k, type, kata, tingkat };
  });
}

/**
 * Kanji yang dinyatakan sudah dikuasai langsung hijau. Jadwal ulangannya disebar (bukan semua di
 * hari yang sama), supaya ratusan kanji tidak jatuh tempo bersamaan dan menutup sesi berikutnya.
 * Pada retensi 0,90, jarak hari = stabilitas S.
 *
 * Tombol "Sudah tahu" di dalam sesi memakai bawaan 30–90 hari: taruhannya satu kanji yang diakui
 * murid sendiri. Tes penempatan memakai `JARAK_TES` (7–21 hari, diubah 2026-11-03): taruhannya
 * ratusan kanji sekaligus atas dasar 20 soal, jadi penempatan yang keliru harus cepat ketahuan.
 */
export function tandaiSudahTahu(data: AppData, k: string, t: string, urutan = 0, jadwal = { mulai: 30, sebar: 61 }): AppData {
  const lama: Partial<KanjiState> = data.ks[k] || {};
  const jarak = jadwal.mulai + (urutan % jadwal.sebar);
  const s: KanjiState = {
    vi: 0, count: 0, wrongStreak: 0, ...lama,
    seen: true, everCorrect: true, green: true, readyWrite: false, lapsed: false, lapses: 0, naikPada: t,
    S: jarak, D: D0(3), interval: jarak, lastReview: t, due: addDays(t, jarak),
  };
  return { ...data, ks: { ...data.ks, [k]: s } };
}

export interface HasilTingkat { tingkat: Tingkat; benar: number; total: number; lulus: boolean; ditandai: number }

/**
 * Menilai tes penempatan. Tingkat yang lulus: semua kanji putihnya ditandai hafal, kecuali
 * kanji yang dijawab salah (jadi merah supaya dilatih). Tingkat yang tidak lulus: kanji yang
 * diujikan dinilai seperti jawaban biasa, sisanya tetap belum dilihat.
 */
export function nilaiPenempatan(
  data: AppData, items: SoalPenempatan[], jawaban: Record<string, boolean>, t: string,
): { data: AppData; hasil: HasilTingkat[] } {
  let d = data;
  const hasil: HasilTingkat[] = [];
  const tiers = [...new Set(items.map((it) => it.tingkat))];
  for (const tg of tiers) {
    const soal = items.filter((it) => it.tingkat === tg && it.k in jawaban);
    const benar = soal.filter((it) => jawaban[it.k]).length;
    const lulus = soal.length > 0 && benar / soal.length >= AMBANG_LULUS;
    let ditandai = 0;
    // tingkat ini tidak bisa dites lagi, lulus atau tidak
    d = { ...d, tesSelesai: [...new Set([...(d.tesSelesai || []), tg])] };
    if (lulus) {
      const salah = new Set(soal.filter((it) => !jawaban[it.k]).map((it) => it.k));
      putihDi(d, tg).forEach((k) => {
        if (salah.has(k)) return;
        d = tandaiSudahTahu(d, k, t, ditandai++, JARAK_TES);
      });
      for (const k of salah) d = applyAnswer(d, k, false, t);
    } else {
      for (const it of soal) d = applyAnswer(d, it.k, jawaban[it.k]!, t);
    }
    hasil.push({ tingkat: tg, benar, total: soal.length, lulus, ditandai });
  }
  return { data: d, hasil };
}
