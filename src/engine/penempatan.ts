import type { AppData, ItemSoal, KanjiState, Tingkat } from "../types";
import { KANJI, TINGKAT, URUT, bisaDipelajari, kosakataUntuk } from "../data/katalog";
import { sample } from "./acak";
import { D0, statusOf } from "./fsrs";
import { applyAnswer } from "./penilaian";
import { addDays } from "./tanggal";

/**
 * Tes penempatan (2026-10-16): murid yang sudah menguasai tingkat bawah tidak perlu
 * mengulang ratusan kanji yang sudah ia kuasai. Sekitar 20 soal arti/bacaan diambil
 * dari kanji yang belum dilihat di setiap tingkat di bawah tingkat pilihan murid.
 * Tingkat dengan ketepatan ≥ 80% dinyatakan lulus: semua kanji putihnya ditandai hafal.
 */
export const TOTAL_SOAL = 20;
export const AMBANG_LULUS = 0.8;

/** tingkat di bawah tingkat pilihan murid yang masih punya kanji belum dilihat */
export function tingkatBawah(data: Pick<AppData, "tg" | "ks">): Tingkat[] {
  const batas = URUT[data.tg || "N5"];
  return TINGKAT.filter((tg) => URUT[tg] < batas && putihDi(data, tg).length > 0);
}

const putihDi = (data: Pick<AppData, "ks">, tg: Tingkat): string[] =>
  KANJI.filter((x) => x.tingkat === tg && bisaDipelajari(x.kanji) && statusOf(data.ks[x.kanji]) === "white").map((x) => x.kanji);

export interface SoalPenempatan extends ItemSoal { tingkat: Tingkat }

export function sesiPenempatan(data: Pick<AppData, "tg" | "ks">): SoalPenempatan[] {
  const tiers = tingkatBawah(data);
  if (!tiers.length) return [];
  const per = Math.max(5, Math.floor(TOTAL_SOAL / tiers.length));
  const dipakai = new Set<string>();
  const items: SoalPenempatan[] = [];
  for (const tg of tiers) {
    sample(putihDi(data, tg), per).forEach((k, i) => {
      const type = i % 2 === 0 ? "meaning" : "reading";
      const kata = kosakataUntuk(k, 0, false, dipakai, tg);
      dipakai.add(kata);
      items.push({ k, type, kata, tingkat: tg });
    });
  }
  return items;
}

/**
 * Kanji yang dinyatakan sudah dikuasai langsung hijau. Jadwal ulangannya disebar 30–90 hari
 * (bukan semua di hari yang sama), supaya ratusan kanji tidak jatuh tempo bersamaan dan menutup
 * sesi berikutnya. Pada retensi 0,90, jarak hari = stabilitas S.
 */
export function tandaiSudahTahu(data: AppData, k: string, t: string, urutan = 0): AppData {
  const lama: Partial<KanjiState> = data.ks[k] || {};
  const jarak = 30 + (urutan % 61);
  const s: KanjiState = {
    vi: 0, count: 0, wrongStreak: 0, ...lama,
    seen: true, everCorrect: true, green: true, readyWrite: false, lapsed: false, lapses: 0,
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
    if (lulus) {
      const salah = new Set(soal.filter((it) => !jawaban[it.k]).map((it) => it.k));
      putihDi(d, tg).forEach((k) => {
        if (salah.has(k)) return;
        d = tandaiSudahTahu(d, k, t, ditandai++);
      });
      for (const k of salah) d = applyAnswer(d, k, false, t);
    } else {
      for (const it of soal) d = applyAnswer(d, it.k, jawaban[it.k]!, t);
    }
    hasil.push({ tingkat: tg, benar, total: soal.length, lulus, ditandai });
  }
  return { data: d, hasil };
}
