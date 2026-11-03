// Mencari kosakata yang punya LEBIH DARI SATU bacaan sah menurut JMdict, lalu memeriksa
// apakah pengecoh soal bacaan pernah memakai bacaan yang ternyata juga benar.
//
// Ini menutup temuan "RAGU no. 1" di laporan-audit.md: `kanji-gabungan.json` hanya menyimpan
// SATU bacaan per kata (`kana`), jadi dari data repositori saja tidak mungkin tahu bahwa
// 日本 juga sah dibaca にっぽん atau 一日 juga sah ついたち. JMdict mencatat semuanya.
//
// Pemakaian:
//   1. Unduh rilis terbaru jmdict-simplified (butuh internet):
//        https://github.com/scriptin/jmdict-simplified/releases
//      Ambil berkas  jmdict-eng-<versi>.json  (atau .json.zip lalu diekstrak).
//   2. node scripts/bacaan-ganda.mjs <jmdict-eng-*.json>
//
// Keluaran: laporan-bacaan-ganda.md — daftar kata yang punya bacaan ganda, ditandai mana yang
// benar-benar berisiko muncul sebagai pengecoh.
//
// Lisensi data: JMdict milik EDRDG (CC BY-SA 4.0) — atribusi sudah ada di halaman "Tentang".
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
if (!argv[0]) {
  console.error("Pemakaian: node scripts/bacaan-ganda.mjs <jmdict-eng-*.json>");
  console.error("Unduh dari https://github.com/scriptin/jmdict-simplified/releases");
  process.exit(1);
}

const data = JSON.parse(readFileSync(new URL("../src/data/kanji-gabungan.json", import.meta.url)));
const jm = JSON.parse(readFileSync(argv[0], "utf8"));

// JMdict: words[].kanji[].text = tulisan, words[].kana[].text = bacaan,
// kana[].appliesToKanji = ["*"] atau daftar tulisan yang cocok untuk bacaan itu.
// Bacaan bertanda "search-only" (sK/sk) dilewati: itu ejaan pencarian, bukan bacaan baku.
const bacaanPerTulisan = new Map();
for (const w of jm.words) {
  const tulisan = (w.kanji ?? []).filter((k) => !k.tags?.includes("sK")).map((k) => k.text);
  if (!tulisan.length) continue;
  for (const kana of w.kana ?? []) {
    if (kana.tags?.includes("sk")) continue;
    const berlaku = !kana.appliesToKanji || kana.appliesToKanji.includes("*") ? tulisan : kana.appliesToKanji;
    for (const t of berlaku) {
      if (!bacaanPerTulisan.has(t)) bacaanPerTulisan.set(t, new Set());
      bacaanPerTulisan.get(t).add(kana.text);
    }
  }
}

/** kana → hiragana, dan buang tanda yang dipakai data aplikasi (～, （な）) */
const bersih = (s) => s.replace(/[～（）]/g, "").replace(/な$/, "");

const ganda = [];
for (const [kata, v] of Object.entries(data.kosakata)) {
  if (!v.arti) continue;
  // kata yang diberi imbuhan di data (～人) atau bentuk sifat (大切（な）) dicari tanpa tanda itu
  const kunci = kata.replace(/[～]/g, "").replace(/（な）$/, "");
  const semua = bacaanPerTulisan.get(kunci);
  if (!semua || semua.size < 2) continue;
  const dipakai = bersih(v.kana);
  const lain = [...semua].filter((b) => b !== dipakai && bersih(b) !== dipakai);
  if (lain.length) ganda.push({ kata, dipakai: v.kana, lain, arti: v.arti });
}

ganda.sort((a, b) => b.lain.length - a.lain.length || a.kata.localeCompare(b.kata));

const baris = [];
const p = (s = "") => baris.push(s);
p("# Kosakata dengan lebih dari satu bacaan sah (JMdict)");
p();
p(`Dibuat: ${new Date().toISOString().slice(0, 10)} · diperiksa ${Object.keys(data.kosakata).length} kosakata`);
p();
p("Kalau `pengecohBacaan` pernah menawarkan salah satu bacaan di kolom \"bacaan sah lain\",");
p("murid yang memilihnya **dihukum walau jawabannya benar** (kategori B6 di laporan audit).");
p("Penanganan yang mungkin: simpan daftar bacaan sah per kata lalu kecualikan dari pengecoh,");
p("atau terima bacaan mana pun yang sah sebagai jawaban benar.");
p();
p(`Ditemukan **${ganda.length}** kata.`);
p();
if (ganda.length) {
  p("| Kata | Bacaan di aplikasi | Bacaan sah lain | Arti |");
  p("|---|---|---|---|");
  for (const g of ganda) p(`| ${g.kata} | ${g.dipakai} | ${g.lain.join(" / ")} | ${g.arti} |`);
}
p();

writeFileSync(new URL("../laporan-bacaan-ganda.md", import.meta.url), baris.join("\n"));
console.log(`laporan-bacaan-ganda.md ditulis — ${ganda.length} kata punya bacaan sah lebih dari satu`);
