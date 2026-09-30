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
- Env var `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` harus diisi di Cloudflare
  (*Settings -> Variables and Secrets*), kalau tidak murid tidak bisa masuk. Lihat bagian Tahap 2.

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

## Tahap 2 — akun dan sinkronisasi

Kemajuan belajar disimpan di server supaya ikut pindah saat murid berganti HP.
IndexedDB tetap sumber kebenaran di perangkat; server hanya cermin yang disinkronkan.

### Menyiapkan Supabase

1. Buat proyek di [supabase.com](https://supabase.com) (paket gratis cukup).
2. Jalankan `supabase/migrations/0001_tahap2.sql` di **SQL Editor**. Berkas itu membuat
   tabel `profil`, `kanji_state`, `log_sesi`, menyalakan RLS, dan menambah fungsi
   `hapus_akun_saya()`.
3. **Authentication -> Email Templates**, tambahkan kode 6 angka ke templat
   **Magic Link** *dan* **Confirm signup** — misalnya `Kode kamu: {{ .Token }}`.
   Langkah ini wajib: templat bawaan hanya memuat tautan, dan di aplikasi yang sudah
   dipasang ke layar utama murid memakai kode, bukan tautan (lihat alasannya di bawah).
4. **Authentication -> URL Configuration**, isi *Site URL* dengan domain Cloudflare Pages.
5. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` — di `.env.local` untuk
   pengembangan, dan di Cloudflare Pages (*Settings -> Variables and Secrets*) untuk
   produksi. Lihat `.env.example`. Jangan pernah memakai `service_role` key: kunci itu
   melewati seluruh RLS.

Tanpa kedua env var itu aplikasi tetap terbangun, tapi layar masuk hanya menjelaskan
bahwa kredensialnya belum diisi.

### Cara masuk: email, tanpa sandi

Murid memasukkan email, lalu mengetik **kode 6 angka** dari email itu. Tautan di email
tetap berfungsi bagi yang memakai peramban, tapi kode adalah jalur utama, dan itu
disengaja: menekan tautan membuka peramban, bukan aplikasi yang terpasang di layar
utama, sehingga sesinya lahir di konteks penyimpanan yang salah dan aplikasi tetap
tampak belum masuk. Mengetik kode membuat sesi lahir di aplikasi yang sedang dipakai.

Kode berlaku 1 jam, dan Supabase membatasi permintaan kode baru sekali per 60 detik.

### Wajib masuk, tapi tetap jalan luring

Masuk diwajibkan **sekali**, saat ada sinyal. Sesudah itu penanda akun tersimpan di
perangkat dan aplikasi selalu bisa dibuka serta dipakai tanpa internet — tidak pernah
memblokir belajar hanya karena server tak terjangkau. Yang mengembalikan murid ke layar
masuk hanya dua hal: menekan "Keluar dari akun", atau server yang benar-benar terhubung
menyatakan sesinya tidak sah lagi. Pembedaan "tidak ada sinyal" versus "ditolak server"
ada di `masalahJaringan()` (`src/sinkron/klien.ts`), dan bila ragu jawabannya selalu
"anggap masalah jaringan".

Akibat yang tidak bisa dihindari: murid yang **belum pernah** masuk di sebuah HP butuh
sinyal sekali untuk memulai.

### Persetujuan

Sesudah masuk, sebelum satu byte pun dikirim, murid ditanya apakah datanya boleh
disimpan di server. Menolak bukan jalan buntu: aplikasi tetap jalan penuh dan datanya
tinggal di perangkat. Pilihan itu bisa diubah kapan saja di halaman Tentang, begitu juga
menghapus akun beserta seluruh datanya di server.

### Cara penggabungan bekerja

`src/sinkron/gabung.ts` murni (tanpa jaringan, tanpa jam, tanpa angka acak) supaya bisa diuji.

- **Kanji** — per rekaman, cap waktu paling akhir yang menang. Bukan "hitungan tertinggi":
  kalau memakai itu, jawaban salah di HP kedua bisa tertimpa rekaman lama berhitungan tinggi,
  sehingga aturan "salah sekali -> hitungan kembali ke nol" bocor. Ada tes khusus untuk ini.
- **Log sesi** — tambah-saja, digabung menurut `id` yang dibuat di perangkat.
- **Meta** (tingkat, tanggal ujian, offset, ketepatan terakhir) — satu cap waktu bersama.

Cap waktu distempel di `src/sinkron/stempel.ts`, dipanggil dari `useAppData.ubah`.
Kode metode di `src/engine/` **tidak** ikut diubah oleh Tahap 2.

Data murid yang sudah belajar sebelum ada akun dilengkapi saat dimuat (`lengkapi()` di
`src/db/penyimpanan.ts`) dengan cap waktu saat pemuatan, bukan tanggal paling tua —
supaya kemajuan nyata di perangkat tidak kalah oleh data server yang lebih tua.

### Yang belum teruji

Seluruh kode sudah lolos typecheck dan 63 tes, tapi **belum pernah dijalankan terhadap
proyek Supabase sungguhan**. Yang perlu dicoba sendiri setelah penyiapan di atas:
masuk dengan kode, sinkronisasi pertama dari perangkat yang sudah punya data lokal,
bentrok dua HP, dan hapus akun.

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
