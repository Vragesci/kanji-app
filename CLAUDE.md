# Aplikasi Kanji — brief proyek

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
3. Kanji naik ke hijau setelah **benar 5 kali di sesi yang berbeda**, lalu lulus
   satu sesi menulis. Salah sekali → hitungan kembali ke nol.
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
- Jarak maksimum = sisa hari menuju tanggal ujian JLPT yang dipilih murid
  (Des/Jul), atau 180 hari kalau tanpa target. Tujuannya: tidak ada kanji yang
  jadwalnya melewati hari ujian.
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
- Bagi murid buta warna, status peta juga dibedakan lewat ukuran huruf: merah kecil, oranye sedang,
  hijau besar (semakin hafal semakin besar).
- Atribusi wajib di halaman "Tentang": materi tingkat JFT dari IRODORI
  (The Japan Foundation); bacaan, komponen kanji, dan sebagian kosakata dari
  JMdict/KANJIDIC2/KRADFILE (EDRDG, CC BY-SA 4.0).
