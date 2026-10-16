// Kana → romaji (Hepburn), cukup untuk bacaan satu kanji di sesi menulis.
const DASAR: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko", が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so", ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to", だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho", ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo", や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro", わ: "wa", を: "o", ん: "n",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o", ゔ: "vu",
};
const KECIL: Record<string, string> = { ゃ: "ya", ゅ: "yu", ょ: "yo" };

const keHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export function keRomaji(kana: string): string {
  const s = keHiragana(kana);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const n = s[i + 1];
    if (c === "っ") {
      const berikut = n ? DASAR[n] : undefined;
      out += berikut ? (berikut.startsWith("ch") ? "t" : berikut[0]) : "";
      continue;
    }
    if (c === "ー") { out += out.slice(-1); continue; }
    const r = DASAR[c];
    if (r === undefined) { out += c; continue; }
    if (n && KECIL[n] && r.endsWith("i")) {
      const akar = r === "shi" || r === "chi" || r === "ji" ? r.slice(0, -1) : r.slice(0, -1);
      const k = KECIL[n]!;
      out += r === "shi" || r === "chi" || r === "ji" ? akar + k.slice(1) : akar + k;
      i++;
      continue;
    }
    out += r;
  }
  // vokal panjang ditulis seperti romaji di data (ou, uu), jadi tidak diubah
  return out;
}
