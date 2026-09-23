import type { AppData, ItemSoal, JenisSoal, KanjiState, RencanaSesi } from "../types";
import { KANJI, URUT, bisaDipelajari, bisaRakit, kosakataUntuk } from "../data/katalog";
import { shuffle } from "./acak";
import { isDue, statusOf, type Status } from "./fsrs";

/** kanji yang aktif: tingkat terpilih dan semua tingkat di bawahnya */
export const aktif = (d: Pick<AppData, "tg">) =>
  KANJI.filter((x) => URUT[x.tingkat] <= URUT[d.tg || "N5"] && bisaDipelajari(x.kanji));

/** kanji yang lolos hitungan 5x benar dan menunggu sesi menulis */
export const daftarTulis = (data: AppData): string[] =>
  aktif(data).map((x) => x.kanji).filter((k) => data.ks[k]?.readyWrite && !data.ks[k]?.green);

// Jenis soal bergiliran: arti, bacaan, rakit, lalu ulang (menurut hitungan benar).
// Kanji hijau (review jangka panjang) selalu rakit.
const GILIRAN: JenisSoal[] = ["meaning", "reading", "rakit"];

// `idx` = posisi kanji ini di dalam sesi (setelah diacak). Tanpa ini, kanji-kanji yang
// hitungannya kebetulan sama (mis. sesi murid baru: semua kanji baru, count=0) semua
// jatuh ke jenis yang sama dan satu sesi jadi tidak bergiliran sama sekali.
function jenisUntuk(k: string, s: KanjiState | undefined, idx: number): JenisSoal {
  const st = statusOf(s);
  const n = (s?.count || 0) + idx;
  const jenis: JenisSoal = st === "green" ? "rakit" : GILIRAN[n % GILIRAN.length]!;
  // Kanji tanpa kosakata yang bisa dirakit (mis. 叔, 綿: hanya bacaan khusus) tetap
  // dilatih lewat soal arti/bacaan, bukan soal rakit yang tidak bisa diselesaikan.
  if (jenis === "rakit" && !bisaRakit(k)) return n % 2 === 0 ? "meaning" : "reading";
  return jenis;
}

/**
 * Acak urutan lalu tentukan jenis dan kata tiap soal. Kata dipilih sambil menghindari
 * kata yang sudah dipakai kanji lain di sesi yang sama (lihat `kosakataUntuk`), supaya
 * kata seperti 学生 tidak tampil dua kali hanya karena kanji 学 dan 生 sama-sama muncul.
 */
function rakitItems(list: string[], ks: Record<string, KanjiState>): ItemSoal[] {
  const dipakai = new Set<string>();
  return shuffle(list).map((k, idx) => {
    const type = jenisUntuk(k, ks[k], idx);
    const kata = kosakataUntuk(k, ks[k]?.vi || 0, type === "rakit", dipakai);
    dipakai.add(kata);
    return { k, type, kata };
  });
}

/** sesi selalu ditutup dengan soal yang paling mungkin dijawab benar */
function tutupDenganTermudah(items: ItemSoal[], ks: Record<string, KanjiState>): ItemSoal[] {
  const easyIdx = items.reduce(
    (best, it, i) => {
      const s = ks[it.k];
      const score = s ? (s.green ? 10 : s.count || 0) : -1;
      return score > best.score ? { i, score } : best;
    },
    { i: -1, score: -1 },
  ).i;
  if (easyIdx >= 0) {
    const [e] = items.splice(easyIdx, 1);
    items.push(e!);
  }
  return items;
}

/** Sesi dari kanji yang dipilih murid sendiri (maksimum 10), tanpa memandang jadwal. Jawabannya tetap dinilai seperti biasa. */
export function sesiPilihan(data: AppData, pilihan: string[]): RencanaSesi {
  const items = rakitItems(pilihan.slice(0, 10), data.ks);
  return { quiz: tutupDenganTermudah(items, data.ks), write: [] };
}

export function buildSession(data: AppData, t: string): RencanaSesi {
  const ks = data.ks;
  const all = aktif(data).map((x) => x.kanji);
  const by = (st: Status) => all.filter((k) => statusOf(ks[k]) === st);

  const pick: string[] = [];
  const take = (arr: string[], n: number) => {
    for (const k of arr) {
      if (pick.length >= 10 || n <= 0) break;
      if (!pick.includes(k)) { pick.push(k); n--; }
    }
  };

  const orangeDue = by("orange")
    .filter((k) => !ks[k]!.readyWrite && isDue(ks[k]!, t))
    .sort((a, b) => ks[a]!.due!.localeCompare(ks[b]!.due!));
  // sesi boleh diulang di hari yang sama; kanji yang belum jatuh tempo hanya dipakai untuk mengisi sisa kuota
  const redDue = by("red");
  const orangeBelum = by("orange")
    .filter((k) => !ks[k]!.readyWrite && !isDue(ks[k]!, t))
    .sort((a, b) => ks[a]!.due!.localeCompare(ks[b]!.due!));
  const greenDue = by("green").filter((k) => isDue(ks[k]!, t));
  const whites = by("white");
  const acc = data.lastAcc;
  // beban menyesuaikan sesi terakhir: <70% tanpa kanji baru, >90% tiga kanji baru
  const newN = acc === null ? 2 : acc < 0.7 ? 0 : acc > 0.9 ? 3 : 2;

  take(orangeDue, 5);
  take(redDue, 2);
  take(greenDue, 1);
  take(whites, newN);
  // isi sisa kuota tanpa melanggar aturan beban
  take(redDue, 10);
  take(orangeDue, 10);
  take(greenDue, 10);
  take(orangeBelum, 10);
  if (acc === null || acc >= 0.7) take(whites, Math.max(0, 10 - pick.length));

  const items = tutupDenganTermudah(rakitItems(pick, ks), ks);
  return { quiz: items, write: daftarTulis(data) };
}
