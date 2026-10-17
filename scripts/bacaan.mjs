// Menyiapkan bacaan on-yomi & kun-yomi tiap kanji dari KANJIDIC2 (EDRDG, CC BY-SA 4.0),
// lewat konversi JSON di https://github.com/davidluzgouveia/kanji-data (MIT). Hanya kolom KANJIDIC yang dipakai.
// Pemakaian: node scripts/bacaan.mjs <kanji-data/kanji.json>
// Hasil: src/data/bacaan.json = { "生": { "on": ["せい","しょう"], "kun": ["い.きる", …] }, … }
import { readFileSync, writeFileSync } from "node:fs";

const sumber = JSON.parse(readFileSync(process.argv[2], "utf8"));
const data = JSON.parse(readFileSync(new URL("../src/data/kanji-gabungan.json", import.meta.url)));
const hasil = {};
const hilang = [];
for (const { kanji } of data.kanji) {
  const r = sumber[kanji];
  if (!r) { hilang.push(kanji); continue; }
  hasil[kanji] = { on: r.readings_on ?? [], kun: r.readings_kun ?? [] };
}
writeFileSync(new URL("../src/data/bacaan.json", import.meta.url), JSON.stringify(hasil));
console.log(Object.keys(hasil).length, "kanji; tanpa data:", hilang.join("") || "-");
