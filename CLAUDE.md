# Ngaji Kanji — brief proyek

Dokumen ini dibaca Claude Code setiap sesi. Isinya keputusan yang sudah diambil,
bukan ide yang masih terbuka. Jangan mengubah metode di bawah tanpa diminta.

## Konteks

Aplikasi belajar kanji berbahasa Indonesia untuk calon pekerja/pemagang ke Jepang
dan murid kelas daring. Pemakai: murid LPK (mulai dari nol), pemagang yang sudah
di Jepang (N3), dan nanti murid tingkat lanjut. Pengajar memakainya berdampingan
dengan kelas Zoom mingguan.

Keunggulan yang dijaga: arti bahasa Indonesia (tidak dimiliki WaniKani/Anki),
urutan mengikuti buku IRODORI yang dipakai di kelas, dan soal memakai kosakata
utuh — bukan huruf lepas.

## Berkas yang disertakan

- `kanji-gabungan.json` — seluruh data. 1.356 kanji, 2.260 kosakata, lima tingkat
  (N5, JFT/Irodori, N3, N2, N1).
- `prototipe-kanji.tsx` — prototipe React yang sudah jalan. Semua logika metode
  dan FSRS ada di sini. Jadikan acuan perilaku, bukan kode akhir.

Struktur data:

```
kanji[]    : { kanji, tingkat, level, bab, kosakata[], bacaan[], distraktor[3] }
kosakata{} : { kana, romaji, arti, seg[[huruf,bacaan]], seg_valid, tingkat, sumber }
```

`seg` dipakai untuk soal rakit kosakata. `seg_valid: false` berarti bacaan khusus
(今日, 大人, 眼鏡) — kanji itu tidak boleh dipecah per bacaan; lewati untuk soal rakit.

## Metode belajar (jangan diubah)

1. Satu sesi = 10 soal, sekitar 15 menit. Sesi harus bisa diselesaikan sambil berdiri
   di kereta.
2. Empat status per kanji: putih (belum dilihat), merah (belum hafal), oranye
   (pernah benar), hijau (hafal). Ditampilkan sebagai peta kotak berwarna.
3. Kanji naik ke hijau setelah **benar 5 kali** (setiap jawaban benar dihitung, termasuk sesi
   ulangan di hari yang sama; diubah 2026-10-16), lalu lulus satu sesi menulis.
   Salah sekali → hitungan kembali ke nol.
4. **Salah 3 kali berturut-turut pada kanji yang sama → ganti kosakata**, bukan
   ganti cara bertanya. Kanji yang sama muncul lewat kata lain (`vi` bertambah).
5. Jenis soal bergiliran: arti, bacaan, rakit kosakata.
6. Beban menyesuaikan ketepatan sesi terakhir: di bawah 70% tidak ada kanji baru,
   di atas 90% tiga kanji baru.
7. Sesi selalu ditutup dengan soal yang paling mungkin benar.

## Penjadwalan: FSRS v4.5

Fase belajar (sebelum hijau) memakai jarak tetap 1-1-2-4-7 hari. Setelah hijau,
jadwal dipegang FSRS dengan parameter bawaan resmi (lihat konstanta `W` di prototipe).

- Target retensi tetap **0,90**. Jangan dijadikan pengaturan murid.
- Jarak maksimum antar-ulangan = 180 hari. Pilihan target ujian JLPT dihapus (2026-10-16).
- Salah di fase hijau: stabilitas turun lewat rumus `S_salah`, dan kosakatanya digeser.
- Pudarnya warna hijau = nilai retrievability, bukan animasi.

## Rencana bertahap

**Tahap 1 — yang dikerjakan sekarang.** PWA React + Vite + TypeScript + Tailwind.
Data disimpan di perangkat (IndexedDB, bukan localStorage, karena datanya besar).
Tanpa akun, tanpa server. Dipasang di Vercel/Netlify, dibagikan sebagai tautan,
bisa dipasang ke layar utama HP dan jalan luring. Sasaran: diuji ke 4 murid LPK
dan 1 pemagang di Jepang.

**Tahap 2 — setelah metodenya terbukti dipakai.** Akun + Supabase: riwayat ikut
antar perangkat, dan pengajar punya papan pantau kelas (kanji apa yang paling
sering salah di seluruh kelas, siapa yang berhenti belajar). Ini fitur yang tidak
dimiliki WaniKani maupun Anki, karena keduanya untuk pembelajar mandiri.

**Tahap 3 — kalau tahap 2 berhasil.** Urutan goresan (data KanjiVG) untuk sesi
menulis, kalimat contoh (Tatoeba), dan audio.

## Batasan penting

- Jangan menambah fitur yang tidak ada di brief ini tanpa ditanyakan dulu.
- Jangan mengarang arti kosakata baru. Semua arti berasal dari data; kalau perlu
  tambahan, ambil dari JMdict lalu tandai `perlu_terjemahan`.
- Antarmuka berbahasa Indonesia. Setiap frasa Jepang selalu disertai romaji.
- Mobile-first. Sebagian besar murid memakai HP Android kelas menengah.
- Pengecualian yang disetujui (2026-09-20): (1) di soal bacaan, kosakata target tampil tanpa romaji
  (romaji langsung membocorkan jawaban); romaji baru tampil setelah murid menjawab. (2) PWA dikunci
  orientasi portrait.
- Pengecualian yang disetujui (2026-09-21): sesi boleh diulang berkali-kali dalam sehari. Kanji yang sudah dijawab hari ini
  tetap bisa muncul, dan kanji oranye yang belum jatuh tempo boleh mengisi sisa kuota. Jadwal 1-1-2-4-7 hari dan FSRS tidak berubah
  (sejak 2026-10-16 hitungan benar naik setiap kali benar, tidak lagi dibatasi sekali per hari).
- Pengecualian yang disetujui (2026-09-21): di soal bacaan, arti kosakata tidak tampil di bawah kata soal dan pilihan jawaban hanya
  berisi hiragana di tengah tanpa romaji, supaya murid mengingat lewat kanji. Arti dan romaji baru tampil setelah murid menjawab.
- Pengecualian yang disetujui (2026-09-21): tombol "Ulangi kanji yang sudah hafal" diganti "Pilih kanji yang ingin dipelajari". Murid mengetuk
  kanji di peta (maksimum 10) lalu memulai sesi dari kanji itu, tanpa memandang jadwal. Jawabannya tetap dinilai dan menggeser jadwal seperti biasa.
- Pengecualian yang disetujui (2026-09-21): di soal arti, romaji tidak tampil di bawah kata soal (baru tampil setelah menjawab).
  Pilihan jawaban salah diambil dari kosakata yang satu lingkup makna bila ada (mis. 南: utara, timur, barat), bukan acak.
- Pengecoh soal bacaan (2026-09-21): pada sebagian soal (sekitar 60%) pilihan salah berupa bacaan yang mirip (dakuten, vokal panjang, っ,
  bacaan kanji yang tertukar, atau bacaan kata nyata yang mirip); sisanya kana acak sepanjang sama. Pilihan hanya hiragana, tanpa romaji.
- Kosakata (2026-10-16): kosakata tiap kanji diurutkan dari yang termudah (tingkat tertinggi di antara kanji
  penyusunnya dan tingkat kata itu sendiri). Soal mengutamakan kata yang semua kanjinya ada di tingkat pilihan murid;
  kalau tidak ada, dipakai kata termudah yang tersedia (mis. 木 di N5 → 木曜日, bukan 木綿).
- Soal rakit (2026-10-16): kotak yang salah menampilkan kanji yang tadi dipilih murid ("Pilihanmu: …").
- Tes penempatan (2026-10-16): murid yang memilih tingkat di atas N5 bisa mengikuti tes sekitar 20 soal arti/bacaan dari
  kanji yang belum dilihat di tingkat-tingkat bawahnya. Tingkat dengan ketepatan ≥ 80% lulus: semua kanji putihnya langsung
  hijau, jadwal ulangannya disebar 30–90 hari; kanji yang dijawab salah jadi merah. Tes tidak mengubah lastAcc maupun log.
- "Sudah tahu" (2026-10-16): pada kanji yang baru pertama kali muncul di sesi, murid bisa mengetuk "Sudah tahu kanji ini —
  lewati"; kanji itu langsung hijau (jadwal sama seperti tes penempatan) dan tidak dihitung dalam ketepatan sesi.
- Peta (2026-10-16): kotak oranye menampilkan 5 titik = berapa kali sudah benar dari 5 sebelum sesi menulis.
- Label tingkat (2026-10-16): data tingkat JFT (Irodori) ditampilkan sebagai "N4" di layar. Isinya tetap mengikuti
  urutan Irodori, jadi sebagian kanjinya (mis. 連, 絡) di daftar JLPT tergolong N3. Kode internal tetap "JFT".
- Sesi menulis (2026-10-16): murid menulis dulu tanpa panduan, lalu mencocokkan dengan kanji yang benar (tampil di
  belakang tulisannya). "Sudah benar" → hijau. "Belum benar" → panduan muncul untuk dijiplak, kanji diulang lain kali.
  Soal tulis memakai kanji itu sendiri sebagai kata bila ada (人 → ひと); kalau tidak, kanji target dikosongkan di dalam
  kata (学□) dan bacaannya ditandai ("Tulis kanji untuk せい (sei)"), supaya jelas yang ditulis hanya satu kanji.
- Bagi murid buta warna, status peta juga dibedakan lewat ukuran huruf: merah kecil, oranye sedang,
  hijau besar (semakin hafal semakin besar).
- Atribusi wajib di halaman "Tentang": materi tingkat JFT dari IRODORI
  (The Japan Foundation); bacaan, komponen kanji, dan sebagian kosakata dari
  JMdict/KANJIDIC2/KRADFILE (EDRDG, CC BY-SA 4.0).
