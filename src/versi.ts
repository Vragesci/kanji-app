/**
 * Versi aplikasi untuk log belajar (Tahap 1b). Diisi `define` di vite.config.ts dari
 * `version` di package.json ditambah cap waktu build (UTC), supaya dua build dari nomor
 * versi yang sama tetap bisa dibedakan — murid tidak pernah memasang versi baru sendiri,
 * jadi inilah yang menjawab "dia menjalankan build kapan?".
 *
 * Di vitest `define` ikut berlaku; "dev" hanya cadangan kalau tidak lewat bundler.
 */
declare const __VERSI__: string;

export const VERSI: string = typeof __VERSI__ === "string" ? __VERSI__ : "dev";
