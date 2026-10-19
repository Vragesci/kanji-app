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
   Salah sekali → hitungan kembali ke nol. Fase ini **tidak memakai jarak hari** (2026-10-19):
   lima kali benar bisa dicapai dalam sehari kalau murid mengulang sesi.
4. **Salah 3 kali berturut-turut pada kanji yang sama → ganti kosakata**, bukan
   ganti cara bertanya. Kanji yang sama muncul lewat kata lain (`vi` bertambah).
5. Jenis soal bergiliran: arti, bacaan, rakit kosakata.
6. Beban menyesuaikan ketepatan sesi terakhir: di bawah 70% tidak ada kanji baru,
   di atas 90% tiga kanji baru.
7. Sesi selalu ditutup dengan soal yang paling mungkin benar.

## Penjadwalan: FSRS v4.5

Fase belajar (sebelum hijau) **tanpa jarak hari** (diubah 2026-10-19; sebelumnya 1-1-2-4-7 hari).
Jarak lama membuat benar ke-5 paling cepat jatuh di hari ke-8, jadi soal tulis praktis tidak pernah
muncul; yang mengatur kapan kanji muncul lagi sekarang antrean sesi, bukan tanggal. Setelah hijau,
jadwal dipegang FSRS dengan parameter bawaan resmi (lihat konstanta `W` di prototipe).
Untuk fase belajar dan antrean, `prototipe-kanji.tsx` sudah tidak lagi jadi acuan.

- Target retensi tetap **0,90**. Jangan dijadikan pengaturan murid.
- Jarak maksimum antar-ulangan = 180 hari. Pilihan target ujian JLPT dihapus (2026-10-16).
- Salah di fase hijau: stabilitas turun lewat rumus `S_salah`, dan kosakatanya digeser.
- Pudarnya warna hijau = nilai retrievability, bukan animasi.

## Antrean sesi (2026-10-19)

Tanpa jarak hari, yang menentukan isi sesi adalah antrean. Konstanta ada di `src/engine/sesi.ts`.

1. Review hijau yang jatuh tempo (FSRS), maksimum 3 per sesi (`REVIEW_MAKS`), supaya tidak menutup
   jatah kanji yang sedang dipelajari.
2. Kanji yang sedang dipelajari, **bergilir**: yang paling lama tidak dilatih di depan
   (`KanjiState.seq` = nomor jawaban terakhir, bukan tanggal, karena sesi boleh diulang dalam
   sehari), lalu yang hitungan benarnya paling tinggi.
3. Kanji baru sebanyak jatah ketepatan (metode 6), **hanya kalau** jumlah kanji yang sudah dilihat
   tapi belum hijau masih di bawah 10 (`PROSES_MAKS` = satu sesi penuh). Kanji yang menunggu tes
   tulis ikut dihitung, jadi tes tulis yang menumpuk juga menahan kanji baru.
4. Sesi pertama (dan saat antrean habis) mengisi kuota dengan kanji baru, supaya sesinya tidak
   cuma dua soal. Ketepatan di bawah 70% tetap menahan kanji baru, kecuali kalau sesi jadi kosong.
5. Soal tulis maksimum 5 per sesi (`TULIS_MAKS`), yang paling lama menunggu di depan; sisanya
   di sesi berikutnya. Kanji yang belum hijau didahulukan; cek tulis kanji yang sudah hijau lewat
   tes penempatan hanya mengisi sisa slot, maksimum 2 per sesi (`CEK_MAKS`).

Daftar soal tulis dihitung **sesudah kuis** dari data terbaru, jadi kanji yang baru mencapai benar
ke-5 (atau baru ditandai "sudah tahu") langsung ditulis di sesi yang sama, bukan sesi berikutnya.

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
  tetap bisa muncul (sejak 2026-10-16 hitungan benar naik setiap kali benar, tidak lagi dibatasi sekali per hari; sejak
  2026-10-19 fase belajar tidak lagi memakai jarak hari sama sekali — lihat "Antrean sesi"). FSRS sesudah hijau tidak berubah.
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
- Kosakata (2026-10-17): selain tingkat, pemilihan kata menghindari kata yang menyeret banyak kanji di atas
  tingkat kanji targetnya (国 N5 → 外国, bukan 国際交流 yang memuat 際・交・流). Kata utuh tetap didahulukan
  daripada kanji telanjang (足) dan bentuk imbuhan (～店), kecuali kalau kata utuhnya memuat kanji yang belum
  diajarkan (足 → 足, bukan 満足). Kanji yang memang tidak punya kata lain setingkat tetap memakai kata itu
  (流 → 国際交流, kata dari Irodori 初級2).
- Peta (2026-10-17): kanji yang sudah dipelajari (merah/oranye/hijau) dikumpulkan di kelompok "Sudah dipelajari"
  paling atas — hijau dulu, lalu oranye, lalu merah — supaya kemajuan murid tidak tertutup ratusan kotak putih.
  Kanji itu tidak digandakan: kelompok IRODORI di bawahnya hanya berisi kanji yang belum dilihat.
- Soal rakit (2026-10-16): kotak yang salah menampilkan kanji yang tadi dipilih murid ("Pilihanmu: …").
- Tes penempatan (2026-10-16, ditambah 2026-10-19): murid yang memilih tingkat di atas N5 bisa mengikuti tes sekitar 20 soal
  arti/bacaan dari kanji yang belum dilihat di tingkat-tingkat bawahnya. Tingkat dengan ketepatan ≥ 80% lulus: semua kanji
  putihnya langsung hijau, jadwal ulangannya disebar 30–90 hari; kanji yang dijawab salah jadi merah. Tes tidak mengubah
  lastAcc maupun log. Kanji yang lulus **tetap menunggu cek tulis** (`readyWrite` + `tahu`): hijau di peta sejak awal supaya
  kemajuan murid langsung terlihat, lalu dicek bertahap lewat sesi menulis maksimum 2 per sesi. Tulisannya benar → tanda cek
  lepas, jadwal FSRS-nya tidak diubah. Belum benar → kanji kehilangan status hijau, jadi merah, dan dipelajari dari awal.
  Pilihan ini (hijau dulu, cek bertahap) diambil karena satu tingkat bisa berisi ratusan kanji: menahan hijau sampai semuanya
  lulus tes tulis berarti ~20 sesi sebelum peta murid berubah.
- "Sudah tahu" (2026-10-16, diubah 2026-10-19): pada kanji yang baru pertama kali muncul di sesi, murid bisa mengetuk
  "Sudah tahu kanji ini — langsung ke tes tulis". Kanji itu **tidak langsung hijau** (beda dengan tes penempatan, yang
  menandai ratusan kanji sekaligus): ia masuk daftar tes tulis sesi itu sebagai pengecekan bahwa memang sudah hafal. Tulisannya benar → hijau seperti kanji yang lulus lewat benar 5 kali;
  belum benar → pengakuannya tidak terbukti, kanji jadi merah dan dipelajari dari awal. Tidak dihitung dalam ketepatan sesi.
- Peta (2026-10-16): kotak oranye menampilkan 5 titik = berapa kali sudah benar dari 5 sebelum sesi menulis.
- Label tingkat (2026-10-16): data tingkat JFT (Irodori) ditampilkan sebagai "N4" di layar. Isinya tetap mengikuti
  urutan Irodori, jadi sebagian kanjinya (mis. 連, 絡) di daftar JLPT tergolong N3. Kode internal tetap "JFT".
- Sesi menulis (2026-10-16): murid menulis dulu tanpa panduan, lalu mencocokkan dengan kanji yang benar (tampil di
  belakang tulisannya). "Sudah benar" → hijau. "Belum benar" → panduan muncul untuk dijiplak, kanji diulang lain kali.
  Soal tulis memakai kanji itu sendiri sebagai kata bila ada (人 → ひと); kalau tidak, kanji target dikosongkan di dalam
  kata (学□) dan bacaannya ditandai ("Tulis kanji untuk せい (sei)"), supaya jelas yang ditulis hanya satu kanji.
- Pengecekan tulisan otomatis (2026-10-16, memajukan sebagian tahap 3): tulisan dinilai aplikasi per goresan memakai data
  KanjiVG (`public/goresan/<tingkat>.json`, disiapkan `scripts/goresan.mjs`; CC BY-SA 3.0, atribusi di "Tentang").
  Diperiksa berurutan: jumlah goresan, arah (goresan panjang saja; titik tidak), bentuk + letak tiap goresan, lalu urutan
  (penugasan termurah antar-goresan). Toleransi di `BATAS` (src/engine/goresan.ts), dikalibrasi dengan tulisan tiruan.
  Benar → hijau. Salah → pesan koreksi + goresan bernomor (yang salah merah) untuk dijiplak, kanji diulang lain kali.
  Kalau data goresan belum terunduh (luring), murid menilai sendiri.
- Nama aplikasi (2026-10-17): tulisan "Ngaji Kanji" memakai huruf Reggae One (SIL OFL), subset Latin saja lewat
  @fontsource/reggae-one (±20 KB, ikut di-precache). Teks lain tetap huruf sistem.
- Logo (2026-10-17): 字 putih di lingkaran biru #3346C2 di atas latar putih (permainan kata "Nga字"). Kanji memakai
  Noto Sans JP Bold (bentuk baku, bukan Reggae One). Ikon dibuat ulang dengan `scripts/ikon.mjs`.
  Nama di beranda & "Tentang" ditulis "Nga字 Kanji" (komponen `NamaAplikasi`): Reggae One, 字 memakai huruf Jepang
  sistem tebal berwarna biru logo; pembaca layar membaca "Ngaji Kanji". Nama di manifest tetap "Ngaji Kanji".
- Detail kanji (2026-10-17): mengetuk kotak di peta beranda (di luar mode memilih) membuka lembar bawah berisi
  on-yomi (katakana) dan kun-yomi (hiragana, okurigana lebih redup) beserta romaji, dari KANJIDIC2
  (`src/data/bacaan.json`, disiapkan `scripts/bacaan.mjs`). Bacaan yang dipakai di kosakata aplikasi didahulukan;
  sisanya lewat "Tampilkan semua bacaan". Contoh kata = kata yang semua kanjinya ada di tingkat pilihan menu atas
  (`tingkatKanjiKata`, tanpa melihat tingkat kata itu sendiri); kalau tidak ada, kata dari tingkat terendah yang
  tersedia dengan keterangan.
- Bagi murid buta warna, status peta juga dibedakan lewat ukuran huruf: merah kecil, oranye sedang,
  hijau besar (semakin hafal semakin besar).
- Atribusi wajib di halaman "Tentang": materi tingkat JFT dari IRODORI
  (The Japan Foundation); bacaan, komponen kanji, dan sebagian kosakata dari
  JMdict/KANJIDIC2/KRADFILE (EDRDG, CC BY-SA 4.0).
