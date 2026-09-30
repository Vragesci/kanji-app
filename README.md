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

Hasil build adalah situs statis di `dist/`. Hostingnya **Cloudflare Pages** (paket gratis: lebar pita tanpa
batas, penggunaan komersial diizinkan, jadi aplikasi boleh dibuat berbayar tanpa naik paket).

Berkas yang mengatur deploy:

- `wrangler.toml` — nama proyek dan folder hasil build (`dist`). Kalau berkas ini ada, Cloudflare
  memakainya sebagai acuan utama, jadi ubah di sini, bukan di dashboard.
- `public/_headers` — header PWA; disalin apa adanya ke akar `dist/` saat build. `sw.js` dan
  `manifest.webmanifest` tidak boleh di-cache lama (kalau tidak, pembaruan tidak sampai ke murid),
  sedangkan `/assets/*` boleh di-cache selamanya karena nama berkasnya memuat hash.
- `.node-version` — Node 24, menyamakan versi build dengan `engines` di `package.json`.

### Pertama kali

Di dashboard Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pilih repositori ini, lalu
isi *Framework preset* `Vite`, *Build command* `npm run build`, *Build output directory* `dist`. Setelah itu
setiap push ke `main` ter-deploy sendiri, dan setiap PR dapat tautan pratinjau.

### Dari terminal

```
npx wrangler pages deploy dist                    # pratinjau
npx wrangler pages deploy dist --branch main      # produksi
```

### Sesudah deploy

Pastikan header benar-benar terpakai (ini yang menentukan pembaruan sampai ke murid atau tidak):

```
curl -sI https://<domain>/sw.js               | grep -i cache-control
curl -sI https://<domain>/manifest.webmanifest | grep -i -E 'cache-control|content-type'
```

Harapannya `no-cache` untuk keduanya, dan `application/manifest+json` untuk manifest.

Lalu cek di HP: buka tautan, pasang ke layar utama, matikan data seluler, buka lagi, dan jalankan satu sesi.

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
