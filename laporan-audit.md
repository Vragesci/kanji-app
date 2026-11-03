# Laporan audit mutu soal — Ngaji Kanji

Tanggal audit: 2026-11-03
Commit terakhir: `9bb5a9b` — "Soal bacaan: semua pilihan wajib berakhiran sama dengan kata soal"
Cabang: `main`

> **Status: sebagian sudah ditindaklanjuti.** Commit `ba9b8a0` ("Mutu soal: tutup lima cacat yang
> ditemukan audit") memperbaiki lima temuan di bawah dan **menolak dua** setelah diperiksa ulang:
>
> - **D16 (soal tulis ambigu, 午後/高校/救急車/孝行/調理方法) — DITOLAK, dan penolakannya benar.**
>   Komponen `Petunjuk` di `SoalTulis.tsx` menampilkan kanji target sebagai kotak putus-putus
>   (午□), jadi posisi yang diminta sudah jelas walau kedua kanjinya sama-sama dibaca ご.
>   Pemeriksaan D16 **dihapus** dari tes regresi.
> - **"Pengecoh arti berbagi kata dengan jawaban benar" sebagai aturan umum — DITOLAK.**
>   Pola itu akan menangkap 春/夏/秋/冬 ("musim semi" vs "musim gugur"), yang justru pengecoh
>   terbaik di aplikasi ini.
>
> Keadaan terukur sesudah `ba9b8a0` (ULANG=10, benih tetap): kategori **B dan C seluruhnya nol**,
> A3 turun 307 → 2, A2 turun 557 → 245. Yang masih terbuka: A2 (245), A5 (55), A4 (1).
> Angka-angka itu kini dikunci sebagai ambang di `src/data/mutu-soal.test.ts`.

Audit ini **tidak mengubah kode aplikasi**. Tidak ada commit, tidak ada push.
Semua arti dan bacaan dicocokkan ke `src/data/kanji-gabungan.json` dan `src/data/bacaan.json`
(KANJIDIC2); tidak ada yang ditebak dari ingatan. Hal yang tidak bisa dipastikan dari data
repositori dikumpulkan di bagian **RAGU** di bawah, bukan dijadikan temuan.

Catatan cara kerja: aplikasi dijalankan dengan `npm run dev` lalu dimainkan di browser pada
lebar 390 px (tampilan HP), bukan hanya dibaca kodenya. IndexedDB `kanji-app` dihapus sebelum
tiap sesi. Audit borongan memanggil fungsi asli — `kosakataUntuk` (`src/data/katalog.ts`),
`pengecohArti`, `pengecohBacaan`, `ekorKata`, `kelasKata` (`src/data/pengecoh.ts`), `kataTulis`,
`jenisUntuk` — lewat `npx vitest run`.

---

## 1. Ringkasan

| | Jumlah |
|---|---|
| Soal dibangkitkan & diperiksa | **109.210** |
| Pengulangan tiap soal (karena pengecoh memakai angka acak) | 10× |
| Tingkat yang diperiksa | N5 (103 kanji), N4/JFT (414), N3 (692), N2 (1.056), N1 (1.377 kanji aktif) |
| Sesi sungguhan yang dimainkan di browser | 3 sesi × 10 soal |

Temuan per kategori:

| Kategori | Temuan | Rincian per nomor daftar periksa |
|---|---|---|
| **B — pengecoh yang justru benar** (paling parah) | **20** | B6: 6 · B7: 13 · B8: 1 |
| **A — pengecoh yang tidak mengecoh** | **922** | A1: **0** · A2: 557 · A3: 307 · A4: 1 · A5: 57 |
| **C — soal yang isinya salah** | **15** | C9: 0 · C10: 1 · C11: 3 · C12: 0 · C13: 1 · *(C18: 10, di luar daftar)* |
| **D — soal tulis** | **5** | D15: **0** · D16: 5 |
| RAGU (perlu diperiksa manusia) | 14 | — |

Tiga hal yang perlu diketahui lebih dulu:

1. **A1 benar-benar sudah tertutup.** Perbaikan ekor okurigana 2026-11-03 diuji pada
   **8.714 soal bacaan berokurigana**: **nol** soal yang pengecohnya tidak seekor dengan
   kata soalnya. Masalah yang Anda laporkan (`苦労する` → `じょうけん`/`たいしゅう`/`もくようび`)
   tidak muncul lagi sama sekali.
2. **A2 dan A3 sebenarnya satu akar masalah, bukan dua.** Pengisi pengecoh di
   `pengecohBacaan` memilih kata lain dengan **jumlah huruf** sama
   (`semua.filter((k) => k.length === v.kana.length)`), bukan jumlah **mora**. Akibatnya kalau
   jawaban benar memuat kana kecil ゃゅょ (`きょう` = 3 huruf tapi 2 mora), pengecohnya jadi
   satu-satunya yang panjangnya berbeda saat dibaca **dan** satu-satunya tanpa kana kecil.
   Terukur: dari 557 temuan A2, **1.017 kemunculan** disebabkan kana kecil dan 412 murni
   panjang; 767 kemunculan jawaban benar adalah satu-satunya pilihan berkana kecil.
   Satu perbaikan (menyaring dengan mora, bukan `length`) menutup mayoritas 864 temuan A2+A3.
3. **Akar kategori B adalah 28 pasang entri kembar di data** — satu kata disimpan dua kali:
   `勉強` & `勉強します`, `元気` & `元気（な）`, `苦手` & `苦手（な）`, `人` & `～人`, `店` & `～店`,
   `種類` & `～種類`, dan 22 pasang lain. Karena keduanya entri terpisah, arti/bacaan yang satu
   dipakai sebagai pengecoh untuk yang lain — padahal keduanya benar.

---

## 2. Tabel temuan

Diurutkan dari paling parah: **B → A → C → D**. Total temuan 962; di bawah ini **40 baris
terparah**. Berkas lengkap: lihat lampiran `audit.tsv` (962 baris) dan `audit-ragu.tsv`.

### B — pengecoh yang justru benar (semua 20 baris)

| # | Kanji | Kata | Jenis | Keempat pilihan | Jawaban benar | Kenapa ini masalah |
|---|---|---|---|---|---|---|
| B6 | 人 | 人 | bacaan | ひと / にん / ひど / すな | ひと | `にん` adalah bacaan sah 人 (data memuat `～人` = にん), jadi murid yang memilihnya dihukum walau tidak salah. |
| B6 | 人 | ～人 | bacaan | ～にん / ～ひと / ～にく / よん | ～にん | Kebalikannya: `～ひと` juga bacaan sah untuk tulisan yang sama. |
| B6 | 店 | 店 | bacaan | みせ / てん / みぜ / どろ | みせ | `てん` adalah bacaan sah 店 (data memuat `～店` = てん). |
| B6 | 店 | ～店 | bacaan | ～てん / ～みせ / ～でん / ほけん | ～てん | `～みせ` juga bacaan sah untuk tulisan yang sama. |
| B6 | 種 | ～種類 | bacaan | ～しゅるい / ～しゅだい / ～じゅるい / しゅるい | ～しゅるい | Pengecoh `しゅるい` identik dengan jawaban benar kecuali tanda `～`; dua pilihan sama-sama betul. |
| B6 | 類 | ～種類 | bacaan | ～しゅるい / ～しゅりょう / ～じゅるい / しゅるい | ～しゅるい | Sama: `しゅるい` adalah bacaan `種類` yang juga ada di data. |
| B7 | 割 | 割れる | arti | Pecah/retak / Rusak/pecah / Menurunkan / Menolong | Pecah/retak | `Rusak/pecah` (arti 壊れる) dan jawaban benar sama-sama memuat "pecah" — dua jawaban betul. |
| B7 | 壊 | 壊れる | arti | Rusak/pecah / Lepas; keluar / Pecah/retak / Memperlihatkan | Rusak/pecah | Pasangan kebalikannya: `Pecah/retak` juga betul untuk 壊れる. |
| B7 | 疑 | 疑問 | arti | Pertanyaan; keraguan / Kepahitan, kegetiran / Keraguan; skeptisisme / Direktur pelaksana | Pertanyaan; keraguan | `Keraguan; skeptisisme` (arti 懐疑) juga memuat "keraguan" — tidak terbedakan murid. |
| B7 | 問 | 疑問 | arti | Pertanyaan; keraguan / Kepahitan, kegetiran / Keraguan; skeptisisme / Direktur pelaksana | Pertanyaan; keraguan | Sama seperti di atas, muncul juga lewat kanji 問. |
| B7 | 疑 | 懐疑 | arti | Keraguan; skeptisisme / Persatuan, kekompakan / Pertanyaan; keraguan / Ginza (kawasan Tokyo) | Keraguan; skeptisisme | Kebalikannya: `Pertanyaan; keraguan` juga betul. |
| B7 | 懐 | 懐疑 | arti | Keraguan; skeptisisme / Pertanyaan; keraguan / Persatuan, kekompakan / Peningkatan semangat | Keraguan; skeptisisme | Idem, lewat kanji 懐. |
| B7 | 細 | 細かい | arti | Kecil, detail/rinci / Rinci, detail / Menarik/lucu / Hangat (benda/perasaan) | Kecil, detail/rinci | `Rinci, detail` (arti 詳しい) sama maknanya dengan jawaban benar. |
| B7 | 詳 | 詳しい | arti | Rinci, detail / Ketat; keras / Pekat; kental / Kecil, detail/rinci | Rinci, detail | Pasangan kebalikannya. |
| B7 | 取 | 取り扱い | arti | Penanganan, pelayanan / Saling, satu sama lain / Sasaran, tujuan / Perlakuan, penanganan | Penanganan, pelayanan | `Perlakuan, penanganan` (arti 扱い) sama-sama "penanganan". |
| B7 | 扱 | 扱い | arti | Perlakuan, penanganan / Saling, satu sama lain / Sasaran, tujuan / Penanganan, pelayanan | Perlakuan, penanganan | Pasangan kebalikannya. |
| B7 | 扱 | 取り扱い | arti | Penanganan, pelayanan / Saling, satu sama lain / Sasaran, tujuan / Perlakuan, penanganan | Penanganan, pelayanan | Idem, lewat kanji 扱. |
| B7 | 検 | 検討 | arti | Pengkajian, pertimbangan / Perhatian, pertimbangan / Jarak yang sangat jauh / Tonjolan, pengangkatan | Pengkajian, pertimbangan | `Perhatian, pertimbangan` sama-sama "pertimbangan". |
| B7 | 討 | 検討 | arti | Pengkajian, pertimbangan / Membangkitkan, menggugah / Keikutsertaan, bergabung / Perhatian, pertimbangan | Pengkajian, pertimbangan | Idem, lewat kanji 討. |
| B7 | 確 | 正確 | arti | Tepat/akurat / Setan, iblis / Harga barang / Tepat, sesuai | Tepat/akurat | `Tepat, sesuai` (arti 適当) sama-sama "tepat". |
| B8 | 係 | 係 | arti | Penanggung jawab / Negara; kenegaraan / Mata air; sumber air / Penanggungjawab | Penanggung jawab | `Penanggungjawab` identik dengan jawaban benar begitu spasi diabaikan — dua jawaban benar. |

### A — pengecoh yang tidak mengecoh (8 dari 922 baris)

| # | Kanji | Kata | Jenis | Keempat pilihan | Jawaban benar | Kenapa ini masalah |
|---|---|---|---|---|---|---|
| A2+A3 | 今 | 今日 | bacaan | きょう / ひにく / ならぶ / あさい | きょう | Jawaban benar satu-satunya dengan 2 mora (pengecoh 3/3/3) **dan** satu-satunya berkana kecil `ょ` — dua petunjuk sekaligus tanpa perlu tahu kanjinya. |
| A2+A3 | 食 | 食事 | bacaan | しょくじ / かんどう / とくべつ / つめたい | しょくじ | 3 mora vs 4/4/4, dan satu-satunya yang memuat `ょ`. |
| A3 | 気 | 病気 | bacaan | びょうき / かんじん / あやまる / ほうてい | びょうき | Hanya jawaban benar memuat kana kecil `ょ`; bentuknya sendiri sudah menunjuk jawaban. |
| A2 | 水 | 水曜日 | bacaan | すいようび / あいじょう / そんちょう / しゅうもん | すいようび | Jawaban benar satu-satunya dengan 5 mora (pengecoh 4/4/4). |
| A5 | 魚 | 金魚 | arti | Ikan mas koki (goldfish) / Gurita / Angsa / Dinosaurus | Ikan mas koki (goldfish) | Jawaban benar 3 kata + keterangan kurung; ketiga pengecoh satu kata — panjang teksnya jomplang. |
| A5 | 鍋 | もつ鍋 | arti | Motsunabe (hot pot jeroan) / Bak mandi, mandi berendam / Imbalan, uang terima kasih / Ladang tebang bakar | Motsunabe (hot pot jeroan) | Kebalikannya: jawaban benar satu kata (sisanya keterangan), pengecoh 3–4 kata. |
| A5 | 吹 | 吹かす | arti | Merokok/mengembuskan asap; menggeber mesin / Kurang (sumbing) / Mempercayakan / Robek/sobek | Merokok/mengembuskan asap; menggeber mesin | Jawaban benar jauh lebih panjang dari ketiga pengecoh. |
| A4 | 近 | 近く | arti | dekat / luar / Sisi barat / Dalam, tengah | dekat | `kelasKata` menilai `近く` sebagai kata **kerja** (karena berakhiran く), jadi pengecohnya dicari dari kata benda — kelas katanya tidak seimbang. Lihat juga RAGU no. 3. |

### C — soal yang isinya salah (7 dari 15 baris)

| # | Kanji | Kata | Jenis | Keempat pilihan | Jawaban benar | Kenapa ini masalah |
|---|---|---|---|---|---|---|
| C18\* | 満 | 満足（な） | bacaan | まんぞく（な） / かいてん（な） / こうむい（な） / げんき（（な） | まんぞく（な） | Pengecoh `げんき（（な）` bentuknya **rusak**: tanda kurung ganda. Batang kata lain dipotong di tengah `（な）` lalu ditambah ekor `（な）` lagi. |
| C18\* | 必 | 必要（な） | bacaan | ひつよう（な） / しゅうい（な） / にがて（（な） / てんちょ（な） | ひつよう（な） | Idem: `にがて（（な）`. Pilihan yang jelas rusak langsung bisa dibuang murid. |
| C18\* | 力 | 入力する | bacaan | にゅうりょくする / にじっせいきする / ちゅうおうしする / とくべつ（なする | にゅうりょくする | `とくべつ（なする` — kurung menggantung di tengah pengecoh する. |
| C18\* | 院 | 入院する | bacaan | にゅういんする / りゅうがくする / しんぱい（する / しあわせ（する | にゅういんする | Dua dari tiga pengecoh bentuknya rusak dalam satu soal. |
| C11 | — | ～曜日 | data | — | ようび | `kana` = `ようび` tapi gabungan `seg` = `～ようび`. Soal rakit & tulis memakai `seg`, jadi bacaan yang ditampilkan tidak sama dengan `kana`. Sama untuk `～月` dan `～日` (3 kata). |
| C10 | — | 似顔 | data | — | Potret wajah; kemiripan wajah (singkatan dari 似顔絵) | Arti masih memuat huruf Jepang `似顔絵` dan tampil apa adanya sebagai pilihan jawaban — bentuknya langsung berbeda dari pengecoh. |
| C13 | 振 | 振興 | rakit | — | Pemajuan, penggalakan | Kanji N3 dilatih lewat `振興` yang memuat `興` (N1), padahal 振 punya kosakata yang lebih mudah. |

\* C18 bukan nomor dari daftar periksa Anda — ini cacat yang saya temukan di luar daftar, masuk
kategori C karena isi soalnya memang salah. Terukur 10 kata terpengaruh, semuanya kata
berakhiran `（な）` atau `する`.

### D — soal tulis (semua 5 baris)

| # | Kanji | Kata | Jenis | Bacaan yang diminta | Kenapa ini masalah |
|---|---|---|---|---|---|
| D16 | 後 | 午後 | tulis | ご | Kedua kanji di `午後` dibaca `ご`. "Tulis kanji untuk ご" tidak bisa dijawab pasti — murid tidak tahu yang dimaksud 午 atau 後. |
| D16 | 高 | 高校 | tulis | こう | `高` dan `校` dua-duanya `こう`. Ambigu dengan cara yang sama. |
| D16 | 救 | 救急車 | tulis | きゅう | `救` dan `急` dua-duanya `きゅう`. |
| D16 | 孝 | 孝行 | tulis | こう | `孝` dan `行` dua-duanya `こう`. |
| D16 | 法 | 調理方法 | tulis | ほう | `方` dan `法` dua-duanya `ほう`. |

**D15: bersih.** Seluruh kanji yang bisa dipelajari punya data goresan di
`public/goresan/<tingkat>.json` (N5, JFT, N3, N2, N1) — nol kanji tanpa data.

**C9 & C12: bersih.** Tidak ada satu pun soal yang kata-nya tidak memuat kanji target, dan tidak
ada kata `seg_valid: false` yang lolos ke soal rakit. Penjaga di `cocokRakit` dan `jenisUntuk`
bekerja sebagaimana mestinya, termasuk untuk kanji hijau yang tidak punya kosakata rakit.

---

## 3. Satu sesi yang saya mainkan

Tiga sesi penuh dimainkan sampai layar おつかれさま (otsukaresama), masing-masing dari IndexedDB
yang sudah dikosongkan, di lebar 390 px.

### Sesi A — tingkat "sampai N5" (sesi pertama murid baru)

Ketepatan yang dilaporkan aplikasi: 25%. Soal 5–10 adalah soal **ulangan** (kanji & kata sama,
jenis soal berbeda) karena kanji baru yang layak kurang dari sepuluh — sesuai `isiSampai` di
`engine/sesi.ts`, dan jawabannya memang tidak dinilai.

| # | Kanji | Kata | Jenis | Keempat pilihan | Benar | Nilai |
|---|---|---|---|---|---|---|
| 1 | 川 | 川 | arti | Pulau / Bukit / Laut / Sungai | Sungai | lolos |
| 2 | 山 | 山 | bacaan | とぶ / て / やま / いろ | やま | **bermasalah (ringan)** — `て` hanya 1 huruf sedangkan tiga lainnya 2; satu pilihan bisa dibuang tanpa berpikir. Bukan A2 penuh karena jawaban benar tidak sendirian di panjangnya. |
| 3 | 学 | 学生 (□生) | rakit | 文 / 営 / 飲 / 学 / 栄 / 覚 | 学 | lolos — kanji target muncul sebagai segmen, pengecoh semirip bentuk |
| 4 | 先 | 先週 | arti | Minggu lalu / Minggu depan / Siang / Kemarin lusa | Minggu lalu | lolos — sekelompok makna (waktu), `Minggu depan` pengecoh yang bagus |
| 5 | 川 | 川 | bacaan | ひく / かい / かわ / しき | かわ | lolos — keempatnya 2 mora |
| 6 | 山 | 山 | arti | Gunung / Pasir / Lembah / Bunga | Gunung | lolos — sekelompok makna (alam) |
| 7 | 学 | 学生 | arti | Pelajar / Nelayan / Guru / Tamu | Pelajar | lolos — sekelompok makna (orang) |
| 8 | 先 | 先週 | bacaan | せんしゅう / りくしゅう / ぜんしゅう / せっしょう | せんしゅう | lolos — soal terbaik di sesi ini: keempatnya 4 mora, semuanya berkana kecil, pengecoh dakuten & tukar-bacaan |
| 9 | 川 | 川 | arti | Matahari / Sungai / Langit / Tanjung | Sungai | lolos |
| 10 | 山 | 山 | bacaan | やま / のび / いど / なつ | やま | lolos — keempatnya 2 mora |

**9 lolos, 1 bermasalah ringan.** Tingkat N5 relatif sehat.

### Sesi B — chip "sampai N3"

Catatan penting: memilih chip "sampai N3" pada data baru **tidak** memunculkan kata sulit.
Kanji putih diambil berurutan, jadi sesi pertama tetap berisi 学・先・山・川 (N5). Jadi untuk
menguji kata sulit saya perlu Sesi C di bawah. Dua catatan dari sesi ini:

- #2 `先週` → pilihan `おしゃべり / しゅうしふ / せんしゅう / よういする`: `よういする` adalah
  bacaan kata kerja する untuk soal kata benda, dan `しゅうしふ` bukan kata nyata. Pengecohnya
  lemah tapi tidak membocorkan jawaban. **lolos (lemah).**
- #7 `山` → `Bunga sakura / Gunung / Pantai,tepi / Batu`: arti `Pantai,tepi` kurang spasi
  sesudah koma. Kosmetik, bukan soal salah.

### Sesi C — 10 kanji N3 dipaksa lewat "Pilih kanji yang ingin dipelajari"

Kanji: 丁 与 並 乾 了 争 介 代 任 伸.

| # | Kata | Jenis | Keempat pilihan | Benar | Nilai |
|---|---|---|---|---|---|
| 1 | 与える | arti | Menabung / Membelok / Memberikan / Roboh, tumbang | Memberikan | lolos — keempatnya kata kerja |
| 2 | 並ぶ | bacaan | ならぶ / あそぶ / およぶ / えらぶ | ならぶ | lolos — soal terbaik dari ketiga sesi: keempatnya 3 mora, berakhiran ぶ, semuanya kata nyata |
| 3 | 伸ばす (□ばす) | rakit | 齢 / 伸 / 申 / 送 / 甲 / 神 | 伸 | lolos |
| 4 | 任せる | arti | Pecah/retak / Mengikuti / Mempercayakan / Memanjangkan | Mempercayakan | lolos |
| 5 | 交代 | bacaan | うたう / こうしき / ごうたい / こうたい | こうたい | lolos (lemah) — `うたう` 3 mora & bentuk kata kerja, menonjol dari tiga lainnya |
| 6 | 紹介 (紹□) | rakit | 八 / 全 / 谷 / 増 / 介 / 強 | 介 | lolos |
| 7 | 丁寧 | arti | Mainan / Teliti / Ekspor / Renang | Teliti | **bermasalah** — `Teliti` satu-satunya kata sifat, tiga pengecohnya kata benda konkret (A4). Sebabnya: `丁寧` disimpan **tanpa** `（な）` di data, sedangkan `大切（な）`, `元気（な）`, `必要（な）` memakainya — jadi `kelasKata` menilai 丁寧 sebagai kata benda dan mencari pengecoh kata benda. |
| 8 | 争う | bacaan | あらそう / ねらう / あらぞう / あらっそう | あらそう | lolos — keempatnya berakhiran う |
| 9 | 乾く (□く) | rakit | 乾 / 朝 / 沸 / 早 / 草 / 是 | 乾 | lolos |
| 10 | 完了 | arti | Penyelesaian / Harga barang / Jumlah uang / Tidak handal | Penyelesaian | lolos |

**9 lolos, 1 bermasalah.**

Tidak ada galat JavaScript di konsol pada ketiga sesi.

Tangkapan layar soal yang bermasalah dikirim terpisah sebagai lampiran (soal #2 Sesi A, soal #7
Sesi C, dan layar おつかれさま tiap sesi); tidak disimpan di dalam repositori agar `git status`
tetap bersih.

---

## 4. RAGU — mencurigakan tapi saya tidak yakin, perlu diperiksa manusia

1. **B6 tidak bisa dipastikan sepenuhnya dari data repositori.** Memastikan "pengecoh ternyata
   bacaan sah juga" butuh kamus yang mencatat **semua** bacaan resmi per kata. Repositori hanya
   punya satu bacaan per kata (`kana`) plus bacaan per-kanji dari KANJIDIC2. Jadi 6 temuan B6 di
   atas hanya yang bisa saya buktikan secara mekanis (ada entri kembar di data). Kata seperti
   `日本` (にほん/にっぽん) atau `一日` (いちにち/ついたち) tidak bisa saya periksa. **Perlu
   dicocokkan ke JMdict yang memuat bacaan ganda.**

2. **12 soal tulis meminta bacaan bentuk rendaku/gemination**, mis. "Tulis kanji untuk じゃ"
   untuk 社 (神社 じんじゃ; KANJIDIC mencatat しゃ), `ぱい` untuk 輩 (先輩; KANJIDIC はい),
   `じっ` untuk 実 (実習; KANJIDIC じつ), juga 派・規・杯・河・済・版・率・筆・絶.
   Secara linguistik ini benar, tapi murid diminta mengenali bentuk yang tidak ada di daftar
   bacaan kanji itu. **Saya tidak yakin ini masalah atau justru disengaja.** Daftar lengkap ada
   di `audit-ragu.tsv`.

3. **`kelasKata` menilai `近く` dan `近い` sebagai kata kerja** karena pola
   `/[一-龯ぁ-ん][うくぐすつぬぶむる]$/` dan `/い$/`. `近く` adalah kata benda/keterangan dan
   `近い` kata sifat-i. Ini memengaruhi pemilihan pengecoh arti. Saya tidak tahu seberapa luas
   salah klasifikasi ini karena tidak ada data kelas kata di `kanji-gabungan.json`.

4. **Dua soal bacaan yang ekornya lolos aturan tapi tetap menonjol:** `帰る` →
   `かえる / あびる / はいる / せんる` dan `得る` → `える / うる / くる / ぶる`. Ekor resmi
   keduanya `る` (bukan `える`), jadi aturan ekor terpenuhi, tapi jawaban benar tetap
   satu-satunya yang berakhiran `える`. **Saya tidak yakin ini bocor atau kebetulan**, karena
   pada `得る` justru pengecohnya (`うる`) adalah bacaan `得る` yang juga sah — kalau begitu ini
   malah kasus B6, bukan A1.

5. **Romaji di data lebih benar daripada `keRomaji`, bukan sebaliknya.** 23 kata berbeda:
   19 soal apostrof sebelum vokal/y (`ten'in` vs `tenin`, `hon'yaku` vs `honyaku`,
   `gen'in` vs `genin`) dan 4 soal っ+chi (`shucchou` vs `shutchou`). Jadi daftar periksa C14
   **tidak** menemukan romaji yang salah di data. Tapi `keRomaji` dipakai di soal tulis
   ("Tulis kanji untuk せい (sei)") dan di detail kanji — **perlu diputuskan konvensi mana yang
   dipakai**, supaya dua tempat tidak menampilkan romaji berbeda untuk kana yang sama.

6. **94 pasang kata berbagi skeleton kanji dengan bacaan berbeda** (`着く`/`着る`,
   `渡す`/`渡る`, `少ない`/`少し`). Saya **tidak** menghitungnya sebagai temuan: tulisannya
   berbeda karena okurigana, jadi pengecoh silang di antaranya justru bagus. Saya sebutkan di
   sini kalau-kalau Anda menilainya lain.

7. **28 pasang entri kembar** (`勉強`/`勉強します`, `元気`/`元気（な）`, dst.) membuat satu kata
   tampil dua kali di katalog dan bisa jadi pengecoh satu sama lain. Saya tidak tahu apakah ini
   disengaja (bentuk kamus vs bentuk pemakaian) atau sisa penggabungan data. Daftar lengkap ada
   di `audit.tsv`.

8. **C13 hampir bersih, tapi dengan satu catatan metode.** Saya hanya menghitung kata **pertama**
   tiap kanji (`vi = 0`), karena itu yang dialami hampir semua murid; hasilnya 1 temuan (振興).
   Kalau murid salah 3× berturut-turut, `vi` bertambah dan kata yang lebih sulit ikut terpakai —
   di jalur itu ada 12 kanji yang kata termudahnya **memang** memuat kanji dua tingkat di atasnya
   (tak terhindarkan, bukan salah pilih). Perlu Anda putuskan apakah jalur `vi` tinggi itu perlu
   dibatasi.

---

## 5. Lampiran & kebersihan repositori

- `audit.tsv` — 962 temuan lengkap (kolom: kat, kanji, kata, jenis, tingkat, opsi, benar, kenapa)
- `audit-ragu.tsv` — 14 baris RAGU
- Tangkapan layar sesi (390 px) untuk soal yang bermasalah

Berkas tes sementara `src/data/__audit.test.ts` sudah **dihapus**. Tidak ada kode aplikasi yang
diubah; `git status` bersih kecuali `laporan-audit.md`.
