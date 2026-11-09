# Serah terima: instrumentasi Ngaji Kanji (Tahap A)

Disusun 2026-11-09. Tujuan: dibuka di MacBook (atau di Windows setelah Node 24 terpasang),
di dalam folder repo `kanji-app`, lalu dikerjakan dari atas ke bawah.

Repo: https://github.com/Vragesci/kanji-app · Live: https://kanji-app-nu.vercel.app

---

## Langkah −1 — sinkronkan repo dulu (ditemukan 2026-11-09)

Salinan `~/kanji-app` di MacBook berhenti di `2e1ba09` (2026-09-23) dan tidak punya remote.
Itu **bukan** satu-satunya salinan. GitHub `Vragesci/kanji-app` ada di `ba9b8a0` (2026-11-03),
**18 commit di depan**, dan `2e1ba09` adalah leluhur langsungnya. Jadi cukup fast-forward,
tidak ada riwayat yang bercabang. Kemungkinan besar commit Oktober–November dibuat lewat
sesi cloud yang push langsung ke GitHub.

Yang belum ada di MacBook antara lain: penilaian goresan otomatis (`src/engine/goresan.ts`,
2026-10-16), jalan keluar sesi tulis (2026-11-03), dan pembatalan papan pantau di `CLAUDE.md`.
Spesifikasi di bawah bergantung pada semuanya. Situs live di Vercel kemungkinan besar sudah
memakai versi GitHub, bukan versi MacBook.

```
cd ~/kanji-app
git status                         # ada perubahan belum di-commit? simpan dulu (git stash), jangan dibuang
git remote add origin https://github.com/Vragesci/kanji-app.git
git fetch origin
git merge --ff-only origin/main    # harus lolos tanpa konflik; kalau menolak, berhenti dan laporkan
git branch -u origin/main          # supaya git pull berikutnya tahu sumbernya
git log -1 --oneline               # harus menunjukkan ba9b8a0
npm install && npm test
```

Jangan commit apa pun di salinan lama sebelum langkah ini selesai.

---

## Langkah 0 — kerjakan ini SEBELUM menulis kode apa pun

Keluhan "soal tulis susah" bisa jadi sudah basi. Jalan keluar sesi tulis
(`"Tulis lagi"` + `"Menurutku tulisanku sudah benar"` pada percobaan ke-3) sudah ada
sejak **2026-11-03**, dan versi baru PWA **tidak dipasang otomatis** — murid harus
menekan tombol "Perbarui" di banner beranda.

Jadi tanyakan dulu ke pengguna yang mengeluh: **apakah mereka melihat tombol "Tulis lagi"
setelah tulisannya ditolak?** Kalau tidak, mereka menjalankan build lama dan masalahnya
bukan soal tulisnya, tapi distribusi pembaruan. Ini gratis dan memakan 10 menit.

---

## Tambahan untuk `CLAUDE.md`

Instrumentasi belum ada di brief, dan brief melarang menambah fitur tanpa ditanyakan.
Tambahkan sebagai keputusan bertanggal di bagian "Rencana bertahap":

> **Tahap 1b — instrumentasi lokal (2026-11-09).** Aplikasi mencatat log belajar per soal
> di IndexedDB, dan murid bisa mengekspornya sebagai satu berkas JSON lewat halaman Tentang.
> Tanpa server, tanpa akun, tetap jalan luring. Tujuannya menjawab tiga hal yang `LogSesi`
> sekarang tidak bisa: soal mana yang paling sering gagal, alasan pengecek goresan menolak
> tulisan murid, dan versi aplikasi mana yang sedang dipakai.
>
> Pengiriman otomatis ke server ditunda ke Tahap 2 (Supabase), menyatu dengan sinkronisasi
> antar perangkat. Log bersifat anonim dan agregat: tidak ada identitas murid, dan tidak ada
> mekanisme yang membuat satu pengguna bisa membaca data pengguna lain (lihat pembatalan
> papan pantau kelas, 2026-11-03).

---

## Yang ada sekarang, dan kenapa tidak cukup

```ts
// src/types.ts
export interface LogSesi { d: string; n: number; acc: number; }  // tanggal, jumlah, ketepatan
```

Per sesi saja. Tidak bisa menjawab: kanji mana yang mentok, jenis soal mana yang paling sulit,
berapa lama satu soal dikerjakan, kenapa tulisan ditolak, dan versi aplikasi mana yang dipakai.

`LogSesi` **jangan dihapus** — beban sesi (`lastAcc`) bergantung padanya. Tambahkan log baru
di sampingnya.

---

## Spesifikasi log baru

Simpan di IndexedDB lewat lapisan yang sudah ada di `src/db/penyimpanan.ts`
(periksa dulu API-nya; kalau perlu, tambahkan satu object store baru `peristiwa`).

```ts
export interface Peristiwa {
  /** ISO waktu lokal */
  t: string;
  /** versi aplikasi — WAJIB, ini yang menjawab "murid pakai build lama?" */
  v: string;
  /** id sesi, acak per sesi, supaya bisa dilihat murid berhenti di soal mana */
  sid: string;
  kanji: string;
  /** kosakata yang dipakai saat itu */
  kata?: string;
  jenis: "meaning" | "reading" | "rakit" | "tulis";
  mode: "learn" | "pilih" | "tes";
  hasil: "benar" | "salah" | "lewat" | "sudahTahu" | "akuBenar";
  /** milidetik dari soal tampil sampai dijawab */
  ms: number;
  /** percobaan ke-n untuk kanji ini di sesi ini */
  ke: number;

  // khusus jenis "tulis" — ini bagian paling berharga
  /** alasan pengecek goresan menolak; ambil langsung dari tipe Hasil di goresan.ts */
  tolak?: "jumlah" | "arah" | "urutan" | "panjang" | "bentuk";
  /** goresan ke berapa yang ditolak */
  tolakKe?: number;
  /** jumlah goresan yang ditulis vs seharusnya (saat tolak === "jumlah") */
  ditulis?: number;
  seharusnya?: number;
  /** nilai gagalTulis dari KanjiState saat itu */
  gagal?: number;
  /** true kalau data goresan belum terunduh dan murid menilai sendiri */
  manual?: boolean;
}
```

### Kenapa `tolak` itu yang terpenting

`src/engine/goresan.ts` sudah mengembalikan alasan penolakan sebagai discriminated union:

```ts
type Hasil =
  | { ok: true }
  | { ok: false; jenis: "jumlah"; ditulis: number; seharusnya: number }
  | { ok: false; jenis: "arah"; ke: number }
  | { ok: false; jenis: "urutan"; ke: number; mirip: number }
  | { ok: false; jenis: "panjang"; ke: number; terlalu: "pendek" | "panjang" }
  | { ok: false; jenis: "bentuk"; ke: number };
```

Jadi mencatatnya hampir nol usaha — datanya sudah ada di tangan, cuma dibuang.

Toleransi sekarang:

```ts
export const BATAS = { bentuk: 0.12, letak: 0.25, panjang: 0.18, urutan: 0.07 };
```

Angka ini dikalibrasi dengan **tulisan tiruan**, bukan jari murid di HP Android kelas menengah.
Begitu distribusi `tolak` dari murid sungguhan masuk, Anda tahu persis angka mana yang perlu
dilonggarkan — tanpa menebak, dan tanpa mengorbankan ketelitian yang lain.

Catatan dari brief: `letak` sudah diketahui tidak bisa diperketat (ke 0,21 menolak 5% tulisan
benar). Yang belum diketahui adalah apakah `letak` justru perlu **dilonggarkan**.

---

## Titik pemasangan (periksa dulu, ini usulan)

- `src/engine/penilaian.ts` — `applyAnswer()` dan `applyWrite()` adalah tempat paling bersih:
  setiap jawaban sudah lewat sini. Tapi fungsinya murni (`AppData -> AppData`), jadi jangan
  menulis ke IndexedDB dari dalamnya. Kembalikan peristiwanya, biarkan pemanggil yang menyimpan.
- `src/ui/Sesi.tsx` — sumber `ms` (waktu soal tampil) dan `sid`.
- `src/engine/goresan.ts` — jangan diubah; cukup teruskan `Hasil` ke atas.
- Versi aplikasi: ambil dari `package.json` lewat `define` di `vite.config.ts`, jangan ditulis tangan.

## Batas yang harus dijaga

- Log **tidak boleh** memblokir UI atau menggagalkan sesi. Bungkus setiap tulis dalam
  try/catch dan abaikan kegagalannya.
- Batasi jumlah baris (mis. 5.000 terakhir) supaya IndexedDB murid tidak membengkak.
- Tambahkan saklar "Bantu tingkatkan aplikasi ini" di Tentang, dan satu paragraf jujur
  tentang apa yang dicatat. Tidak ada identitas, tidak ada teks bebas.
- Tambahkan tes di `src/engine/` mengikuti pola `*.test.ts` yang sudah ada. Proyek ini punya
  suite vitest yang nyata — jalankan `npm test` dan `npm run typecheck` sebelum commit.

---

## Ekspor

Tombol di halaman Tentang: "Ekspor data belajar" → unduh satu `.json` berisi `ks`, `log`,
`peristiwa`, dan versi aplikasi. Dengan 4–5 penguji ini sudah cukup: minta mereka kirim
berkasnya lewat LINE, lalu analisis di sini.

Pertanyaan yang harus bisa dijawab dari berkas itu:

1. Berapa persen soal tulis gagal, dibanding arti / bacaan / rakit?
2. Distribusi `tolak` — mana yang dominan: `letak`, `panjang`, `bentuk`, `urutan`, `jumlah`?
3. Apakah sesi sering berakhir tepat setelah soal tulis gagal? (pakai `sid` + urutan waktu)
4. Berapa kali `"akuBenar"` dipakai, dan di kanji mana?
5. Versi aplikasi apa saja yang beredar?

Nomor 2 dan 5 yang paling mungkin langsung mengubah keputusan.

---

## Tahap B (nanti, bukan sekarang)

Kirim `peristiwa` borongan ke Supabase, menyatu dengan Tahap 2 di brief. Pola yang dipakai:
tabel mentah disimpan 90 hari, diringkas bulanan ke tabel agregat, lalu baris mentah dihapus —
supaya free tier 500 MB tidak pernah terlampaui. Untuk sekadar jumlah pengguna,
`@vercel/analytics` sudah cukup (gratis di plan Hobby), dengan catatan sesi luring tidak terhitung.
