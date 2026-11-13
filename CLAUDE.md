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
   Salah sekali → hitungan **turun satu**, tidak kembali ke nol (diubah 2026-11-02; dengan reset
   penuh, lima benar harus berturut-turut sementara kata dan jenis soalnya berganti tiap
   pertemuan, jadi hitungan di layar praktis tidak pernah bergerak).
4. **Salah 3 kali berturut-turut pada kanji yang sama → ganti kosakata**, bukan
   ganti cara bertanya. Kanji yang sama muncul lewat kata lain (`vi` bertambah).
5. Jenis soal bergiliran: arti, bacaan, rakit kosakata.
6. Beban menyesuaikan ketepatan sesi terakhir: di bawah 70% **satu** kanji baru (diubah
   2026-11-02; dulu nol, dan itu mengunci murid dari nol pada belasan kanji yang sama selama
   berhari-hari), 70–90% dua, di atas 90% tiga. Sesi pertama murid baru = 4 kanji baru, dan
   paling banyak 6 kanji baru per sesi saat sisa kuota longgar.
   Kalau kanji yang layak diajukan kurang dari sepuluh, sisa kuota diisi **pengulangan** kanji
   yang sama memakai kata yang sama dengan jenis soal berbeda (arti lalu bacaannya), bukan
   kanji baru. Jawaban ulangan tidak dinilai dan tidak menambah hitungan benar.
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

**Tahap 1b — instrumentasi lokal (2026-11-09).** Aplikasi mencatat log belajar per soal
di IndexedDB, dan murid bisa mengekspornya sebagai satu berkas JSON lewat halaman Tentang.
Tanpa server, tanpa akun, tetap jalan luring. Tujuannya menjawab tiga hal yang `LogSesi`
sekarang tidak bisa: soal mana yang paling sering gagal, alasan pengecek goresan menolak
tulisan murid, dan versi aplikasi mana yang sedang dipakai.

Pengiriman otomatis ke server ditunda ke Tahap 2 (Supabase), menyatu dengan sinkronisasi
antar perangkat. Log bersifat anonim dan agregat: tidak ada identitas murid, dan tidak ada
mekanisme yang membuat satu pengguna bisa membaca data pengguna lain (lihat pembatalan
papan pantau kelas, 2026-11-03).

Rincian yang sudah dikerjakan: tipe `Peristiwa` di `src/types.ts`, pembangunnya di
`src/engine/peristiwa.ts` (murni, ada tesnya), penyimpanan di object store `peristiwa`
(IndexedDB versi 2, paling banyak 5.000 baris terakhir), pemanggilan dari `src/ui/Sesi.tsx`
dan `src/ui/soal/SoalTulis.tsx`, saklar "Bantu tingkatkan aplikasi ini" dan tombol
"Ekspor data belajar" di `src/ui/Tentang.tsx`. Versi aplikasi diambil dari `package.json`
lewat `define` di `vite.config.ts` (`src/versi.ts`), ditambah cap waktu build supaya dua
build dari versi yang sama tetap bisa dibedakan. Mencatat tidak boleh menggagalkan sesi:
setiap penulisan dibungkus try/catch dan kegagalannya diabaikan.

**Tahap 2 — setelah metodenya terbukti dipakai.** Akun + Supabase, dengan satu tujuan
saja: riwayat belajar ikut antar perangkat, supaya kemajuan murid tidak hilang saat
ganti HP atau membersihkan data browser. Data belajar sekarang hanya ada di IndexedDB,
dan IndexedDB terikat ke alamat situs — ganti alamat berarti semua kemajuan hilang.

Papan pantau kelas untuk pengajar **dibatalkan** (2026-11-03): aplikasinya sudah dilepas
ke umum, bukan lagi hanya untuk murid satu LPK, jadi tidak ada "kelas" yang dipantau.
Jangan membangun tabel kelas, kolom peran, atau kebijakan yang mengizinkan satu pengguna
membaca data pengguna lain.

**Tahap 3 — kalau tahap 2 berhasil.** Urutan goresan (data KanjiVG) untuk sesi
menulis, kalimat contoh (Tatoeba), dan audio.

## Batasan penting

- Jangan menambah fitur yang tidak ada di brief ini tanpa ditanyakan dulu.
- Jangan mengarang arti kosakata baru. Semua arti berasal dari data; kalau perlu
  tambahan, ambil dari JMdict lalu tandai `perlu_terjemahan`.
- Arti tidak boleh memuat huruf Jepang (tampil apa adanya sebagai pilihan jawaban, bentuknya langsung
  berbeda dari pengecoh), dan `kana` tiap kosakata harus sama dengan gabungan `seg`-nya. Diperbaiki
  2026-11-03: `似顔` (keterangan 似顔絵 dibuang) serta `～曜日`, `～月`, `～日` (kana diberi ～ mengikuti
  konvensi `～人`).
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
  Ekor wajib sama (2026-11-03): semua pilihan berakhiran sama dengan kata soal (伝える → semua berakhiran える; 苦労する →
  semua berakhiran する; 大切（な） → semua berakhiran （な）), lihat `ekorKata`. Dilaporkan pemakai: 苦労する dulu diberi
  pengecoh じょうけん, たいしゅう, もくようび — murid tidak perlu tahu arti maupun bacaannya, cukup pilih satu-satunya yang
  berakhiran する. Terukur 201 dari 528 kata berokurigana (38%) bocor begitu; sesudah diperbaiki 0. Kalau kata nyata
  yang seekor tidak cukup, pengecoh dirakit dari batang kata lain + ekor yang sama (たいしゅう → たいしする).
  Empat perbaikan lanjutan dari audit 2026-11-03:
  (1) Pilihan dicocokkan menurut **mora**, bukan jumlah huruf — きょう tiga huruf tapi dua mora, jadi pencocokan per
  huruf membuat jawaban benar satu-satunya yang panjangnya beda saat dibaca sekaligus satu-satunya yang berkana kecil
  (terukur 4% dan 2% soal → 1% dan 0%).
  (2) Batang kata yang dipotong tidak boleh memuat ～ atau kurung: perakit ekor sempat menghasilkan pengecoh rusak
  seperti げんき（（な） dan とくべつ（なする.
  (3) Bacaan sah dari tulisan yang sama tidak boleh jadi pengecoh (人 ひと vs ～人 にん, 店 みせ vs ～店 てん): `intiKata`
  menyamakan tulisan yang hanya beda ～ atau akhiran gramatikal, dan `tukarBacaanKanji` dimatikan untuk kata satu kanji
  tanpa okurigana karena menukar bacaannya justru menghasilkan bacaan yang benar.
  (4) Arti dianggap bertumpuk kalau berbagi satu **alternatif utuh** di antara tanda / ; atau koma — 割れる "Pecah/retak"
  dan 壊れる "Rusak/pecah" sama-sama berisi "pecah", jadi dua pilihan sama-sama benar. Berbagi satu kata saja tidak
  cukup: "musim semi" dan "musim gugur" tetap pengecoh yang baik.
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
- Tes penempatan (2026-10-16, dirombak 2026-11-03): murid yang memilih tingkat di atas N5 bisa menguji **satu tingkat
  bawah** dengan 20 soal arti/bacaan dari kanji yang belum dilihat di tingkat itu. Ketepatan >= 80% (16 dari 20) lulus:
  semua kanji putih tingkat itu langsung hijau, jadwal ulangan pertama disebar **7-21 hari** (`JARAK_TES`); kanji yang
  dijawab salah jadi merah. **Tiap tingkat hanya bisa dites sekali** (`tesSelesai` di AppData) - gagal berarti tingkat itu
  dipelajari seperti biasa. Tingkat dengan kanji putih < 10 (`MIN_PUTIH`) tidak ditawari. Jumlah kanji yang dipertaruhkan
  disebut di tombolnya sebelum tes dimulai. Tes tidak mengubah lastAcc maupun log.
  Alasan rombakan: murid melaporkan "baru 50 soal tapi sudah hafal 680 kanji". Dulu satu tes memborong semua tingkat di
  bawah pilihan murid dan membagi 20 soal rata (`max(5, 20/jumlah tingkat)`), jadi tingkat N4 yang isinya 311 kanji
  divonis oleh 6 soal pilihan ganda: memilih "sampai N2" lalu ikut tes 18 soal langsung menandai 689 kanji sebagai hafal,
  menghabiskan seluruh kanji putih, dan membuat sesi belajar kosong selama 30+ hari. Tesnya juga bisa diulang tanpa batas
  (terukur 22x berturut-turut), sehingga lolos karena menebak mencapai +-29%. Sesudah rombakan, 680 kanji menuntut 60 soal
  di tiga tes terpisah.
- "Sudah tahu" (2026-10-16): pada kanji yang baru pertama kali muncul di sesi, murid bisa mengetuk "Sudah tahu kanji ini —
  lewati"; kanji itu langsung hijau dan tidak dihitung dalam ketepatan sesi. Jadwal ulangannya tetap 30-90 hari (bawaan
  `tandaiSudahTahu`), bukan 7-21 hari seperti tes penempatan: taruhannya satu kanji yang diakui murid sendiri, bukan
  ratusan kanji sekaligus.
- Peta (2026-10-16, diperluas 2026-11-02): kotak merah dan oranye menampilkan 6 titik — titik pertama
  berarti kanji sudah dikenalkan (terisi sejak kanji pertama kali muncul), lima sisanya = berapa kali
  sudah benar dari 5 sebelum sesi menulis. Dasarnya *endowed progress*: kemajuan yang terlihat sejak
  langkah pertama, tanpa mengaku-aku kemajuan yang belum terjadi.
- Kemajuan (2026-11-02): beranda menampilkan tiga angka yang sudah bergerak di sesi pertama — kanji
  yang sudah dipelajari, kanji yang sudah hafal, dan berapa kanji naik tingkat dalam 7 hari terakhir
  (`naikPada` di KanjiState). Akhir sesi menampilkan "kanji baru dikenalkan" dan "naik tingkat".
  Alasannya: "Kanji hafal" saja baru bergerak setelah 5 benar + sesi menulis, jadi murid melihat
  angka 0 selama berhari-hari walau kanji yang dipelajarinya terus bertambah.
- Label tingkat (2026-10-16): data tingkat JFT (Irodori) ditampilkan sebagai "N4" di layar. Isinya tetap mengikuti
  urutan Irodori, jadi sebagian kanjinya (mis. 連, 絡) di daftar JLPT tergolong N3. Kode internal tetap "JFT".
- Sesi menulis (2026-10-16): murid menulis dulu tanpa panduan, lalu mencocokkan dengan kanji yang benar (tampil di
  belakang tulisannya). "Sudah benar" → hijau. "Belum benar" → panduan muncul untuk dijiplak, kanji diulang lain kali.
  Jalan keluar (2026-11-03): sesudah pengecekan goresan menolak, murid boleh "Tulis lagi" di sesi yang sama, dan pada
  percobaan ke-3 (`gagalTulis` >= 2 di KanjiState) muncul "Menurutku tulisanku sudah benar — tandai hafal". Tanpa itu,
  kanji yang tulisannya tidak pernah diterima pengecek tersangkut selamanya: tetap `readyWrite`, tidak pernah hijau, dan
  tidak kembali ke soal pilihan karena penyusun sesi melewati kanji `readyWrite`. Pengecek goresan membantu murid,
  bukan menguncinya.
  Soal tulis memakai kanji itu sendiri sebagai kata bila ada (人 → ひと); kalau tidak, kanji target dikosongkan di dalam
  kata (学□) dan bacaannya ditandai ("Tulis kanji untuk せい (sei)"), supaya jelas yang ditulis hanya satu kanji.
- Pengecekan tulisan otomatis (2026-10-16, memajukan sebagian tahap 3): tulisan dinilai aplikasi per goresan memakai data
  KanjiVG (`public/goresan/<tingkat>.json`, disiapkan `scripts/goresan.mjs`; CC BY-SA 3.0, atribusi di "Tentang").
  Diperiksa berurutan: jumlah goresan, arah (goresan panjang saja; titik tidak), bentuk + letak + **panjang bentangan**
  tiap goresan, lalu urutan (penugasan termurah antar-goresan). Toleransi di `BATAS` (src/engine/goresan.ts),
  dikalibrasi dengan tulisan tiruan.
  Pemeriksaan panjang ditambahkan 2026-11-02 setelah murid melaporkan tulisan salah dinilai benar: bentuk
  dibandingkan setelah titik tengah kedua goresan disamakan, jadi goresan separuh panjang hanya meleset sedikit di
  tiap titik dan tetap lolos (terukur: 33% kanji). Dengan `panjang: 0.18` kebocoran itu tinggal 1% dan tulisan benar
  tetap diterima 99%. Yang masih lolos dan belum diperbaiki: satu goresan yang bentuk dan panjangnya benar tapi
  letaknya jauh meleset (toleransi `letak` tidak bisa diperketat tanpa menolak banyak tulisan yang benar —
  memperketatnya ke 0,21 menolak 5% tulisan benar dan tetap meloloskan 68% goresan salah letak).
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
- Tampilan game "gaya A" (2026-11-13, disetujui pemilik): seluruh aplikasi memakai tema malam biru (`latar`
  #151A3D, `kartu` #212861) dengan aksen emas (`aksen` #FFC83D) dan tombol utama tebal berbayang. Token warna
  di `src/index.css` diganti nilainya, bukan namanya; permukaan kartu memakai token baru `kartu` (dulu `bg-white`),
  dan teks di atas warna status memakai `text-latar` (dulu `text-white`). Huruf tetap huruf sistem.
  Yang ditambahkan hanya lapisan tampilan dan bunyi; metode, penilaian, dan jadwal tidak berubah:
  (1) **Kombo** di sesi: hitungan jawaban benar beruntun, tampil mulai ×2; salah mengembalikannya ke nol.
  (2) **Batang kemajuan per soal**: tiap soal satu ruas, hijau/merah sesuai jawabannya.
  (3) **Bintang** di akhir sesi (`bintang` di `src/engine/permainan.ts`), ambangnya sama dengan ambang beban
  sesi butir 6: di bawah 70% satu, 70–90% dua, di atas 90% tiga. Tes penempatan tidak diberi bintang.
  (4) **Pangkat** tujuh jenjang (見習い minarai → 新人 shinjin → 先輩 senpai → 班長 hanchou → 職長 shokuchou →
  工場長 koujouchou → 社長 shachou) dari jumlah kanji hijau di semua tingkat; batas pangkat 3–7 = jumlah kanji
  sampai akhir N5, N4, N3, N2, N1, dihitung dari data (`PANGKAT`, `pangkatDari`).
  (5) **Rantai harian** dari `LogSesi` (`rantai`): hari berturut-turut yang punya sesi; hari ini yang belum
  dimainkan tidak memutus rantai sampai harinya lewat.
  (6) **Efek suara otomatis** (`src/suara.ts`): benar, salah, kombo (mulai ×3), dan naik (kanji baru hafal atau
  sesi selesai dengan 70% ke atas). Dibuat dengan Web Audio tanpa berkas audio, ditambah getar pendek.
  Bisa dimatikan lewat tombol di kepala sesi atau halaman Tentang (`suara` di AppData; undefined = menyala).
  (7) Layar hasil punya tombol "Main satu sesi lagi" bila masih ada kanji untuk dilatih.
  (8) **Pengucapan kosakata** (memajukan sebagian audio Tahap 3): memakai mesin suara bawaan perangkat
  (Web Speech, `ucapkan` di `src/suara.ts`), tanpa berkas audio. Yang dibacakan **kana dari data**, bukan
  tulisan kanjinya, supaya bacaannya pasti sama dengan yang diajarkan. Berbunyi otomatis **setelah** murid
  menjawab (sebelum itu ia membocorkan jawaban soal bacaan, sama seperti romaji) dan lewat tombol pengeras
  suara di kartu kata serta contoh kata di detail kanji. Tombol tidak tampil di perangkat tanpa suara Jepang.
  Kalau mutu suara bawaan mengecewakan, langkah berikutnya berkas audio per kosakata (belum diputuskan).
  Sudah disetujui tetapi **belum dibangun**: beranda sebagai peta perjalanan per bab Irodori, halaman koleksi,
  kartu untuk dibagikan ke media sosial, dan papan peringkat mingguan
  antarmurid dengan gelar (membutuhkan akun dan server Tahap 2; yang boleh terlihat pengguna lain hanya nama
  panggilan dan skor mingguan — ini mengubah sebagian keputusan 2026-11-03). Mockup: kanvas "Ngaji Kanji
  tampilan game". Alamat yang dipilih untuk saat ini: `ngajikanji.vercel.app`.
- Hitungan pengunjung (2026-11-13, disetujui pemilik): Vercel Web Analytics (`@vercel/analytics`, komponen
  `<Analytics />` di `src/App.tsx`) untuk menjawab "berapa orang yang memakai aplikasi ini". Anonim dan agregat,
  tanpa cookie; tidak mengirim kemajuan belajar maupun log `Peristiwa`, yang tetap hanya di perangkat.
  Dijelaskan ke murid di halaman Tentang. Perlu dinyalakan sekali di dasbor Vercel (tab Analytics).
