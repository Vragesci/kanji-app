// Bacaan on-yomi/kun-yomi untuk halaman detail kanji (2026-10-17).
// Sumber: KANJIDIC2 (EDRDG, CC BY-SA 4.0), disiapkan oleh scripts/bacaan.mjs.
import mentah from "./bacaan.json";
import type { Tingkat } from "../types";
import { KAMUS, KMAP, URUT, layak, tingkatKanjiKata } from "./katalog";
import { keRomaji } from "../engine/romaji";

const BACAAN = mentah as Record<string, { on: string[]; kun: string[] }>;

export interface Bacaan {
  /** on-yomi dalam katakana, kun-yomi dalam hiragana */
  tampil: string;
  /** kun-yomi: bagian yang ditulis dengan kanji */
  akar: string;
  /** kun-yomi: okurigana (hiragana sesudah kanji), mis. きる pada 生きる */
  okuri: string;
  romaji: string;
  /** dipakai di kosakata aplikasi ini (dibandingkan dengan pembagian bacaan per kanji) */
  dipakai: boolean;
}

const keKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

// Huruf ber-dakuten/handakuten → huruf dasarnya (rendaku: 生 しょう → 誕生 たんじょう)
const DASAR: Record<string, string> = Object.fromEntries(
  [..."がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ"].map((c) => [c, c.normalize("NFD")[0]!]),
);
const tanpaDakuten = (s: string) => (s ? (DASAR[s[0]!] ?? s[0]!) + s.slice(1) : s);

/** apakah bacaan satu kanji di kosakata (`seg`) adalah bentuk dari bacaan KANJIDIC `akar` */
function cocok(seg: string, akar: string): boolean {
  if (!seg || !akar) return false;
  const a = tanpaDakuten(seg), b = tanpaDakuten(akar);
  if (a === b) return true;
  // っ di akhir (gemination): 学 がく → 学校 がっこう
  if (a.endsWith("っ") && a.length === b.length && b.startsWith(a.slice(0, -1)) && "くつちき".includes(b.at(-1)!)) return true;
  return false;
}

/**
 * Bacaan kanji `k` di semua kosakata aplikasi, beserta kana yang langsung mengikutinya (okurigana):
 * 生まれる → { baca: "う", ekor: "まれる" }, 学生 → { baca: "せい", ekor: "" }.
 */
function bacaanDiKosakata(k: string): { baca: string; ekor: string }[] {
  const hasil: { baca: string; ekor: string }[] = [];
  for (const w of KMAP[k]?.kosakata ?? []) {
    const v = KAMUS[w];
    if (!v?.seg_valid) continue;
    v.seg.forEach(([huruf, baca], i) => {
      if (huruf !== k || !baca) return;
      let ekor = "";
      for (const [h, b] of v.seg.slice(i + 1)) { if (b !== "") break; ekor += h; }
      hasil.push({ baca, ekor });
    });
  }
  return hasil;
}

/**
 * Kun-yomi dipakai kalau akarnya cocok DAN okurigana-nya cocok dengan kana sesudah kanji:
 * なま (tanpa okurigana) hanya untuk 生 yang tidak diikuti kana; う.まれる untuk 生まれる/生まれます, bukan う.む.
 */
function kunDipakai(pakai: { baca: string; ekor: string }[], akar: string, okuri: string): boolean {
  return pakai.some(({ baca, ekor }) => {
    if (!cocok(baca, akar)) return false;
    if (!okuri) return ekor === "";
    return ekor.startsWith(okuri.slice(0, Math.max(1, okuri.length - 1)));
  });
}

export function bacaanKanji(k: string): { on: Bacaan[]; kun: Bacaan[] } {
  const r = BACAAN[k] ?? { on: [], kun: [] };
  const pakai = bacaanDiKosakata(k);
  const on = r.on.map((x) => ({
    tampil: keKatakana(x), akar: keKatakana(x), okuri: "", romaji: keRomaji(x), dipakai: pakai.some((p) => cocok(p.baca, x)),
  }));
  const lihat = new Set<string>();
  const kun: Bacaan[] = [];
  for (const x of r.kun) {
    // "い.きる" = akar い + okurigana きる; "-り" / "ひと-" = hanya dipakai sebagai akhiran/awalan
    const bersih = x.replace(/-/g, "");
    const [akar, okuri = ""] = bersih.split(".");
    if (!akar || lihat.has(bersih.replace(".", ""))) continue;
    lihat.add(bersih.replace(".", ""));
    kun.push({ tampil: akar + okuri, akar, okuri, romaji: keRomaji(akar + okuri), dipakai: kunDipakai(pakai, akar, okuri) });
  }
  // yang dipakai di kosakata aplikasi didahulukan; urutan KANJIDIC dipertahankan di dalamnya
  const urut = (xs: Bacaan[]) => [...xs.filter((b) => b.dipakai), ...xs.filter((b) => !b.dipakai)];
  return { on: urut(on), kun: urut(kun) };
}

/**
 * Contoh kosakata untuk kanji `k` sesuai tingkat pilihan murid: kata yang semua kanjinya ada di tingkat itu
 * (urutan termudah dari katalog). Kalau tidak ada, kata dari tingkat kanji terendah yang tersedia, ditandai `diAtas`.
 */
export function contohKata(k: string, tg: Tingkat, maks = 6): { kata: string[]; diAtas: boolean } {
  const semua = (KMAP[k]?.kosakata ?? []).filter(layak);
  const setingkat = semua.filter((w) => tingkatKanjiKata(w) <= URUT[tg]);
  if (setingkat.length) return { kata: setingkat.slice(0, maks), diAtas: false };
  // tidak ada yang setingkat: hanya kata dari tingkat terendah yang tersedia (木 di N5 → 木曜日, bukan juga 木綿)
  const terendah = Math.min(...semua.map(tingkatKanjiKata));
  return { kata: semua.filter((w) => tingkatKanjiKata(w) === terendah).slice(0, Math.min(3, maks)), diAtas: semua.length > 0 };
}
