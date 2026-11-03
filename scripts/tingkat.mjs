// Memeriksa tingkat tiap kanji terhadap acuan LUAR, lalu menulis laporan-tingkat.md.
// Tidak mengubah data; hasilnya untuk dibaca dan diputuskan manusia.
//
// Kenapa perlu: JLPT berhenti menerbitkan daftar kanji resmi sejak revisi 2010, jadi label
// "N3"/"N2" tidak punya acuan resmi. Yang resmi dan stabil adalah 学年別漢字配当表 (gakunenbetsu
// kanji haitouhyou) dari MEXT — kelas berapa di SD Jepang tiap kanji diajarkan — dan frekuensi
// kemunculan di koran. Keduanya ada di KANJIDIC2 sebagai `grade` dan `freq`.
//
// Tingkat N1 di data ini didefinisikan sebagai "300 kanji jouyou tersering yang belum tercakup
// tingkat lain" (lihat meta.sumber) — jadi N1 adalah KERANJANG SISA, bukan tingkat kesulitan.
// Akibatnya kanji sedasar 田, 王, 草 terdampar di sana. Skrip ini memberi angka untuk itu.
//
// Pemakaian:
//   git clone --depth 1 https://github.com/davidluzgouveia/kanji-data /tmp/kanji-data
//   node scripts/tingkat.mjs /tmp/kanji-data/kanji.json
// (sumber yang sama dipakai scripts/bacaan.mjs; MIT, datanya dari KANJIDIC2 — EDRDG, CC BY-SA 4.0)
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
if (!argv[0]) {
  console.error("Pemakaian: node scripts/tingkat.mjs <kanji-data/kanji.json>");
  process.exit(1);
}
const luar = JSON.parse(readFileSync(argv[0], "utf8"));
const data = JSON.parse(readFileSync(new URL("../src/data/kanji-gabungan.json", import.meta.url)));

const URUT = { N5: 0, JFT: 1, N3: 2, N2: 3, N1: 4 };
const NAMA = { N5: "N5", JFT: "N4 (IRODORI)", N3: "N3", N2: "N2", N1: "N1" };
const TINGKAT = ["N5", "JFT", "N3", "N2", "N1"];
/** jlpt_new 5..1 → urutan 0..4 yang sama dengan URUT */
const jlptKeUrut = (n) => ({ 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 })[n];

const daftar = data.kanji.map((x) => {
  const r = luar[x.kanji] ?? {};
  return {
    kanji: x.kanji,
    app: x.tingkat,
    urutApp: URUT[x.tingkat],
    grade: r.grade ?? null,           // 1..6 = SD, 8 = jouyou SMP, null = di luar jouyou
    freq: r.freq ?? null,             // peringkat frekuensi koran (kecil = sering)
    jlptNew: r.jlpt_new ?? null,      // rekonstruksi komunitas, BUKAN resmi
    urutRef: r.jlpt_new == null ? null : jlptKeUrut(r.jlpt_new),
  };
});

const baris = [];
const p = (s = "") => baris.push(s);

p("# Laporan tingkat kanji terhadap acuan luar");
p();
p(`Dibuat: ${new Date().toISOString().slice(0, 10)} · ${daftar.length} kanji di data aplikasi`);
p();
p("Acuan yang dipakai:");
p("- **`grade`** — 学年別漢字配当表 (MEXT): kelas berapa di SD Jepang kanji itu diajarkan. **Resmi dan stabil.**");
p("- **`freq`** — peringkat frekuensi di koran Jepang (KANJIDIC2). **Objektif.**");
p("- **`jlpt_new`** — rekonstruksi komunitas atas tingkat JLPT. **Tidak resmi**: JLPT berhenti");
p("  menerbitkan daftar kanji per tingkat sejak revisi 2010, jadi angka ini perkiraan, bukan kebenaran.");
p();

// ---- 1. sebaran tingkat app terhadap kelas SD ----
p("## 1. Tingkat aplikasi terhadap kelas SD Jepang");
p();
p("| Tingkat app | kls 1 | kls 2 | kls 3 | kls 4 | kls 5 | kls 6 | SMP (8) | luar jouyou |");
p("|---|---|---|---|---|---|---|---|---|");
for (const t of TINGKAT) {
  const g = daftar.filter((x) => x.app === t);
  const sel = (n) => g.filter((x) => x.grade === n).length;
  p(`| ${NAMA[t]} | ${sel(1)} | ${sel(2)} | ${sel(3)} | ${sel(4)} | ${sel(5)} | ${sel(6)} | ${sel(8)} | ${g.filter((x) => x.grade == null).length} |`);
}
p();

// ---- 2. kanji dasar yang terdampar di tingkat atas ----
// Ini temuan yang bisa ditindaklanjuti: kanji yang anak SD kelas 1-3 pelajari,
// tapi di aplikasi baru muncul di N2/N1.
const terdampar = daftar
  .filter((x) => x.grade != null && x.grade <= 3 && x.urutApp >= 3)
  .sort((a, b) => a.grade - b.grade || (a.freq ?? 9999) - (b.freq ?? 9999));
p("## 2. Kanji dasar yang terdampar di tingkat atas");
p();
p("Kanji yang dipelajari anak SD Jepang kelas 1–3 tapi di aplikasi ini baru muncul di N2/N1.");
p("Murid yang memilih \"sampai N5\" tidak akan pernah bertemu kanji ini.");
p();
if (terdampar.length === 0) p("_Tidak ada._");
else {
  p("| Kanji | Tingkat app | Kelas SD | Frekuensi koran |");
  p("|---|---|---|---|");
  for (const x of terdampar) p(`| ${x.kanji} | ${NAMA[x.app]} | ${x.grade} | ${x.freq ?? "-"} |`);
}
p();

// ---- 3. keranjang N1 ----
const n1 = daftar.filter((x) => x.app === "N1");
const n1sd = n1.filter((x) => x.grade != null && x.grade <= 6);
p("## 3. Isi keranjang N1");
p();
p(`N1 berisi ${n1.length} kanji. Di antaranya **${n1sd.length} adalah kanji SD** (kelas 1–6).`);
p("Ini akibat definisi N1 di `meta.sumber`: \"kanji jouyou tersering yang belum tercakup tingkat");
p("lain\" — jadi kanji dasar yang kebetulan tidak ada di sumber IRODORI/N3/N2 ikut terjaring.");
p();
p("Saran: pakai `grade` lalu `freq` sebagai kunci urutan **di dalam** N1, atau pindahkan kanji");
p("kelas 1–3 ke tingkat yang lebih bawah. Keduanya bersandar pada acuan resmi, bukan tebakan.");
p();

// ---- 4. selisih terhadap rekonstruksi JLPT ----
const adaRef = daftar.filter((x) => x.urutRef != null);
const selisih = {};
for (const x of adaRef) {
  const d = x.urutApp - x.urutRef;
  selisih[d] = (selisih[d] ?? 0) + 1;
}
p("## 4. Selisih terhadap rekonstruksi JLPT komunitas");
p();
p(`Dari ${adaRef.length} kanji yang punya \`jlpt_new\`: **${selisih[0] ?? 0} cocok persis**.`);
p();
p("| Selisih (app − acuan) | Jumlah | Artinya |");
p("|---|---|---|");
for (const d of Object.keys(selisih).map(Number).sort((a, b) => a - b)) {
  const arti = d === 0 ? "sama" : d > 0 ? `app ${d} tingkat lebih sulit` : `app ${-d} tingkat lebih mudah`;
  p(`| ${d > 0 ? "+" : ""}${d} | ${selisih[d]} | ${arti} |`);
}
p();
p("**Selisih negatif pada tingkat N4 (IRODORI) sebagian besar DISENGAJA**, bukan kesalahan:");
p("urutan IRODORI mendahulukan kanji yang langsung terpakai di tempat kerja (塩, 卵, 湯, 焼),");
p("yang di daftar JLPT tergolong N2. `CLAUDE.md` sudah mencatat kebijakan ini. Yang perlu");
p("ditinjau adalah selisih **positif** — kanji dasar yang justru dipelajari belakangan.");
p();

// ---- 5. kanji tanpa acuan sama sekali ----
const tanpa = daftar.filter((x) => x.grade == null && x.freq == null);
p("## 5. Kanji tanpa acuan luar");
p();
p(`${tanpa.length} kanji tidak punya \`grade\` maupun \`freq\` — umumnya di luar jouyou`);
p("(nama tempat, kanji khusus). Tingkatnya tidak bisa diperiksa dengan cara ini.");
if (tanpa.length) { p(); p("> " + tanpa.map((x) => x.kanji).join(" ")); }
p();

writeFileSync(new URL("../laporan-tingkat.md", import.meta.url), baris.join("\n"));
console.log(`laporan-tingkat.md ditulis — ${daftar.length} kanji, ${terdampar.length} kanji dasar terdampar, ${n1sd.length}/${n1.length} isi N1 adalah kanji SD`);
