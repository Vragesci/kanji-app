import type { KanjiState } from "../types";
import { diff } from "./tanggal";

// FSRS (Free Spaced Repetition Scheduler) v4.5 dengan parameter bawaan resminya.
// Model DSR: tiap kanji punya Stability (berapa hari ingatan bertahan),
// Difficulty (seberapa berat kanji itu bagi murid), dan Retrievability
// (peluang masih ingat saat ini). Kanji dimunculkan saat peluang ingat ~90%.
export const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;
export const DECAY = -0.5;
export const FACTOR = 19 / 81;
/** Target retensi tetap 0,90. Bukan pengaturan murid. */
export const RETENSI = 0.9;
// Retensi tetap 0.90; jarak maksimum antar-ulangan 180 hari (target ujian dihapus 2026-10-16).
export const MAX_DEFAULT = 180;

/** Jarak fase belajar (sebelum hijau) setelah jawaban benar ke-1, 2, 3, 4, 5 (di hari berbeda) */
export const NEXT_GAP = [1, 1, 2, 4, 7];

export const clampD = (d: number): number => Math.min(10, Math.max(1, d));
/** peluang masih ingat setelah `lewat` hari, untuk ingatan sestabil S hari */
export const ingat = (lewat: number, S: number): number =>
  Math.pow(1 + FACTOR * (lewat / Math.max(S, 0.1)), DECAY);
export const D0 = (g: number): number => clampD(W[4] - (g - 3) * W[5]);
export const nextD = (D: number, g: number): number =>
  clampD(W[7] * D0(3) + (1 - W[7]) * (D - W[6] * (g - 3))); // FSRS v4.5: D0(3); D0(4) baru di FSRS-5
export const S_benar = (D: number, S: number, R: number): number =>
  S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1));
export const S_salah = (D: number, S: number, R: number): number =>
  W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));

/** jarak hari berikutnya: dihitung dari stabilitas, bukan dari jumlah jawaban benar */
export const jarakHari = (S: number, batas: number = MAX_DEFAULT): number =>
  Math.min(batas, Math.max(1, Math.round((S / FACTOR) * (Math.pow(RETENSI, 1 / DECAY) - 1))));

export function fsrsState(s: KanjiState): { S: number; D: number } {
  return { S: s.S || s.interval || 7, D: s.D || D0(3) };
}

export type Status = "white" | "red" | "orange" | "green";

export function statusOf(s: KanjiState | undefined): Status {
  if (!s || !s.seen) return "white";
  if (s.green) return "green";
  if (s.everCorrect) return "orange";
  return "red";
}

/** kekuatan hijau = peluang murid masih ingat hari ini (retrievability FSRS asli, 0..1; batas visual ada di UI) */
export function greenStrength(s: KanjiState, t: string): number {
  const { S } = fsrsState(s);
  const R = ingat(Math.max(0, diff(s.lastReview ?? t, t)), S);
  return Math.min(1, R);
}

export const isDue = (s: KanjiState, t: string): boolean => s.due! <= t;
