// Log belajar per soal (Tahap 1b, 2026-11-09). Bagian murni: membangun satu baris
// `Peristiwa` dan memangkas daftar yang terlalu panjang. Penulisannya ke IndexedDB ada di
// src/db/penyimpanan.ts, pemanggilannya di src/ui/Sesi.tsx — fungsi di sini tidak menyentuh
// penyimpanan maupun UI supaya bisa dites tanpa browser.
import type { AlasanTolak, Peristiwa } from "../types";
import type { Hasil } from "./goresan";
import { VERSI } from "../versi";

/** paling banyak sekian baris disimpan; yang tertua dibuang lebih dulu */
export const MAKS_PERISTIWA = 5000;

/** Bagian `Peristiwa` yang berasal dari pemanggil; `t` dan `v` diisi di sini. */
export type IsiPeristiwa = Omit<Peristiwa, "t" | "v">;

/** waktu lokal dalam bentuk ISO, mis. "2026-11-09T17:04:31+07:00" */
export function capWaktu(d = new Date()): string {
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const zona = off === 0 ? "Z" : `${off < 0 ? "-" : "+"}${p(off / 60)}:${p(off % 60)}`;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${zona}`;
}

/**
 * Membangun satu baris log. Nilai `undefined` dibuang supaya berkas ekspornya rapat dan
 * bedanya jelas antara "tidak berlaku" dan "nol".
 */
export function buatPeristiwa(isi: IsiPeristiwa, waktu = new Date(), versi = VERSI): Peristiwa {
  const p: Peristiwa = { t: capWaktu(waktu), v: versi, ...isi };
  for (const k of Object.keys(p) as (keyof Peristiwa)[]) {
    if (p[k] === undefined) delete p[k];
  }
  return p;
}

/**
 * Bagian soal tulis dari hasil pengecek goresan. Datanya sudah ada di tangan saat koreksi
 * ditampilkan ke murid — tanpa ini alasan penolakan terbuang, padahal justru itu yang
 * memberi tahu toleransi mana di `BATAS` yang perlu dilonggarkan untuk jari murid sungguhan.
 */
export function dariHasil(h: Hasil): Pick<Peristiwa, "tolak" | "tolakKe" | "ditulis" | "seharusnya"> {
  if (h.ok) return {};
  const tolak: AlasanTolak = h.jenis;
  if (h.jenis === "jumlah") return { tolak, ditulis: h.ditulis, seharusnya: h.seharusnya };
  return { tolak, tolakKe: h.ke };
}

/** Menyisakan `maks` baris terakhir. */
export function batasiPeristiwa(daftar: Peristiwa[], maks = MAKS_PERISTIWA): Peristiwa[] {
  return daftar.length <= maks ? daftar : daftar.slice(daftar.length - maks);
}

/** id sesi acak, 8 huruf; bukan identitas murid, hanya penanda satu sesi. */
export function idSesi(): string {
  const acak = globalThis.crypto?.randomUUID?.();
  return acak ? acak.slice(0, 8) : Math.random().toString(36).slice(2, 10);
}
