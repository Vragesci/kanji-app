// Menyiapkan data goresan dari KanjiVG (https://kanjivg.tagaini.net, CC BY-SA 3.0, Ulrich Apel).
// Pemakaian: node scripts/goresan.mjs <folder kanjivg/kanji>
// Hasil: public/goresan/<tingkat>.json = { "人": ["M…", "M…"], … } — jalur SVG tiap goresan, berurutan.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const folder = process.argv[2];
if (!folder) throw new Error("folder kanjivg/kanji belum diberikan");
const data = JSON.parse(readFileSync(new URL("../src/data/kanji-gabungan.json", import.meta.url)));
const keluar = new URL("../public/goresan/", import.meta.url);
mkdirSync(keluar, { recursive: true });

const perTingkat = {};
const hilang = [];
for (const { kanji, tingkat } of data.kanji) {
  const hex = kanji.codePointAt(0).toString(16).padStart(5, "0");
  const berkas = join(folder, `${hex}.svg`);
  if (!existsSync(berkas)) { hilang.push(kanji); continue; }
  const svg = readFileSync(berkas, "utf8");
  const goresan = [...svg.matchAll(/<path[^>]*id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"/g)]
    .map((m) => [Number(m[1]), m[2].replace(/\s+/g, " ").trim()])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
  if (!goresan.length) { hilang.push(kanji); continue; }
  (perTingkat[tingkat] ??= {})[kanji] = goresan;
}
for (const [tg, isi] of Object.entries(perTingkat)) {
  writeFileSync(new URL(`${tg}.json`, keluar), JSON.stringify(isi));
  console.log(tg, Object.keys(isi).length, "kanji");
}
console.log("tanpa data goresan:", hilang.length, hilang.join(""));
