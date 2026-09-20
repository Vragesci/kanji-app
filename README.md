# Aplikasi Kanji

PWA belajar kanji berbahasa Indonesia (tahap 1: React + Vite + TypeScript + Tailwind, data di IndexedDB, tanpa akun).
Keputusan metode ada di `CLAUDE.md`; jangan diubah tanpa diminta.

## Perintah

```
npm install
npm run dev        # pengembangan
npm test           # tes mesin (metode, FSRS, penjaga data, peta)
npm run typecheck
npm run build      # tsc + vite build -> dist/
npm run preview    # menjalankan hasil build (service worker hanya aktif di sini, bukan di `dev`)
```

## Deploy

Hasil build adalah situs statis di `dist/`. Konfigurasi sudah ada untuk kedua penyedia; pakai salah satu dan hapus yang lain.

**Vercel** (`vercel.json`): `npx vercel` untuk pratinjau, `npx vercel --prod` untuk produksi.
Atau impor repositori di dashboard; Vercel mengenali Vite otomatis.

**Netlify** (`netlify.toml`): `npx netlify deploy` untuk pratinjau, `npx netlify deploy --prod` untuk produksi.
Atau hubungkan repositori di dashboard.

Kedua berkas mengatur header yang penting bagi PWA: `sw.js` dan `manifest.webmanifest` tidak boleh di-cache lama
(kalau tidak, pembaruan tidak sampai ke murid), sedangkan `/assets/*` boleh di-cache selamanya (nama berkas memuat hash).

Setelah deploy, cek di HP: buka tautan, pasang ke layar utama, matikan data seluler, buka lagi, dan jalankan satu sesi.

## Pembaruan versi

Versi baru diunduh di latar belakang dan tidak dipasang otomatis. Di beranda muncul banner "Versi baru aplikasi tersedia"
dengan tombol Perbarui; banner tidak muncul saat sesi berlangsung, supaya sesi murid tidak terpotong.
Data belajar ada di IndexedDB dan tidak terpengaruh pembaruan.

## Petunjuk pasang ke layar utama

Beranda menampilkan kartu "Pasang di layar utama" selama aplikasi dibuka dari tab browser dan belum ditutup murid.
Isinya menyesuaikan perangkat: iPhone/iPad mendapat langkah manual (Safari tidak punya tombol pasang) beserta alasannya, yaitu
iOS dapat menghapus data situs yang tidak dibuka sekitar seminggu kecuali aplikasinya dipasang, dan data di Safari tidak ikut pindah ke aplikasi yang baru dipasang (jadi murid diminta memasang sebelum mulai belajar); Android/Chrome mendapat tombol
"Pasang aplikasi" bila browser menawarkannya, atau petunjuk menu bila tidak. Panduan lengkap selalu ada di halaman Tentang.
Kode: `src/pasang.ts` dan `src/ui/PetunjukPasang.tsx`.

## Ikon

`public/icon-192.png`, `icon-512.png` (bentuk membulat), `icon-maskable-512.png` (kotak penuh, glyph di zona aman 80%),
`apple-touch-icon.png` (180 px), `favicon-32.png`. Semuanya glyph 漢 putih di atas biru `#1F4E79`, dirender dari
Hiragino Sans. Kalau ingin ikon lain, ganti berkas-berkas ini dengan ukuran yang sama.

## Data

`src/data/kanji-gabungan.json` dibundel ke JS dan ikut di-precache, jadi aplikasi jalan luring sejak kunjungan pertama.
Salinan di root (`kanji-gabungan.json`) adalah berkas sumber; kalau data diperbarui, salin lagi ke `src/data/`.
