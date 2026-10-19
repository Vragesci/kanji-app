import type { AppData, KanjiState } from "../types";
import { addDays, diff } from "./tanggal";
import {
  D0, S_benar, S_salah, W, clampD, fsrsState, ingat, jarakHari, nextD,
} from "./fsrs";

/** Menilai satu jawaban (percobaan pertama sebuah kanji di sesi ini). */
export function applyAnswer(data: AppData, k: string, correct: boolean, t: string): AppData {
  const ks = { ...data.ks };
  const lama: Partial<KanjiState> = ks[k] || {};
  const s: KanjiState = { seen: false, vi: 0, count: 0, wrongStreak: 0, ...lama };
  const seq = (data.seq || 0) + 1;
  s.seen = true;
  s.lastSeen = t;
  s.seq = seq; // urutan antrean: kanji yang paling lama tidak dilatih didahulukan di sesi berikutnya
  if (s.green) {
    // fase jangka panjang: jadwal dihitung FSRS, bukan kelipatan tetap
    const { S, D } = fsrsState(s);
    const R = ingat(Math.max(0, diff(s.lastReview || t, t)), S);
    const g = correct ? 3 : 1;
    s.D = nextD(D, g);
    s.S = correct ? S_benar(s.D, S, R) : Math.min(S, S_salah(s.D, S, R));
    s.lapsed = !correct;
    if (!correct) {
      s.lapses = (s.lapses || 0) + 1;
      s.vi = (s.vi || 0) + 1; // lupa: muncul lagi lewat kosakata lain
    }
    s.lastReview = t;
    s.interval = jarakHari(s.S);
    s.due = addDays(t, s.interval);
  } else if (correct) {
    // Fase belajar tidak memakai jarak hari (2026-10-19): kanji dilatih lagi di sesi berikutnya,
    // tidak perlu menunggu besok. Yang mengatur kapan ia muncul adalah antrean di engine/sesi.ts.
    s.everCorrect = true;
    s.wrongStreak = 0;
    // setiap jawaban benar dihitung, termasuk sesi ulangan di hari yang sama (5 kali benar → sesi menulis)
    s.count = (s.count || 0) + 1;
    s.vi = (s.vi || 0) + 1; // pertemuan berikutnya pakai kosakata lain
    if (s.count >= 5) s.readyWrite = true;
  } else {
    s.count = 0; // salah sekali: hitungan kembali ke nol
    s.salahTotal = (s.salahTotal || 0) + 1; // dipakai menentukan Difficulty awal
    s.wrongStreak = (s.wrongStreak || 0) + 1;
    if (s.wrongStreak >= 3) { s.vi = (s.vi || 0) + 1; s.wrongStreak = 0; } // ganti kosakata, bukan cara bertanya
  }
  ks[k] = s;
  return { ...data, seq, ks };
}

/**
 * Hasil sesi menulis. Lulus = kanji hijau dan masuk fase FSRS.
 *
 * Belum benar: kanji yang sampai di sini lewat hitungan benar 5 kali tetap menunggu dan ditulis
 * lagi lain kali. Kanji yang diakui hafal tanpa bukti tulis (`tahu`: tombol "Sudah tahu" atau
 * lulus tes penempatan) justru dipelajari dari awal — pengakuannya tidak terbukti, jadi kanji itu
 * jadi merah dan kehilangan status hijaunya (2026-10-19).
 *
 * Sudah benar pada kanji yang sudah hijau (cek tulis sesudah tes penempatan): jadwal FSRS-nya
 * tidak diubah, hanya tanda menunggu ceknya yang dilepas.
 */
export function applyWrite(data: AppData, k: string, ok: boolean, t: string): AppData {
  const lama: Partial<KanjiState> = data.ks[k] || {};
  if (!ok) {
    if (!lama.tahu) return data;
    const kembali: KanjiState = {
      vi: 0, wrongStreak: 0, ...lama,
      seen: true, tahu: false, readyWrite: false, count: 0, everCorrect: false, green: false,
    };
    return { ...data, ks: { ...data.ks, [k]: kembali } };
  }
  if (lama.green) {
    const tetap: KanjiState = { seen: true, vi: 0, count: 0, wrongStreak: 0, ...lama, readyWrite: false, tahu: false };
    return { ...data, ks: { ...data.ks, [k]: tetap } };
  }
  // Kanji yang tadi sering salah mulai dengan Difficulty lebih tinggi, jadi jaraknya lebih rapat.
  const D = clampD(D0(3) + 0.4 * (lama.salahTotal || 0));
  const S = W[3];
  const j = jarakHari(S);
  const s: KanjiState = {
    seen: true, vi: 0, count: 0, wrongStreak: 0, ...lama,
    green: true, readyWrite: false, tahu: false, lapsed: false, lapses: 0,
    S, D, interval: j, lastReview: t, due: addDays(t, j),
  };
  return { ...data, ks: { ...data.ks, [k]: s } };
}
