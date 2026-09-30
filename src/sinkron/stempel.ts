import { idBaru } from "../db/penyimpanan";
import type { AppData } from "../types";

/** Bidang meta yang berbagi satu cap waktu. */
const META = ["tg", "ujian", "offset", "lastAcc"] as const;

/**
 * Menstempel cap waktu pada bagian yang berubah antara `lama` dan `baru`.
 *
 * Sengaja di sini, bukan di `penilaian.ts` atau `fsrs.ts`: cap waktu adalah
 * kebutuhan sinkronisasi, bukan bagian dari metode belajar, dan kode metode
 * tidak boleh berubah karena Tahap 2.
 *
 * Perbandingannya memakai identitas objek, sama seperti `simpan()`: fungsi
 * metode selalu membuat objek kanji yang baru saat mengubahnya.
 *
 * Murni: `sekarang` disuntikkan, supaya perilakunya bisa diuji.
 */
export function stempel(lama: AppData, baru: AppData, sekarang: string): AppData {
  let hasil = baru;

  // ---- kanji yang berubah
  let ks: typeof baru.ks | null = null;
  for (const k of Object.keys(baru.ks)) {
    if (baru.ks[k] === lama.ks[k]) continue;
    ks ??= { ...baru.ks };
    ks[k] = { ...baru.ks[k]!, diubah: sekarang };
  }
  if (ks) hasil = { ...hasil, ks };

  // ---- entri log baru: beri id kalau belum ada
  if (baru.log !== lama.log && baru.log.some((e) => !e.id)) {
    hasil = { ...hasil, log: baru.log.map((e) => (e.id ? e : { ...e, id: idBaru() })) };
  }

  // ---- meta
  if (META.some((f) => baru[f] !== lama[f])) hasil = { ...hasil, metaDiubah: sekarang };

  return hasil;
}
