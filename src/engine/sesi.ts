import type { AppData, ItemSoal, JenisSoal, KanjiState, ModeSesi, RencanaSesi } from "../types";
import { KANJI, URUT, bisaDipelajari, bisaRakit } from "../data/katalog";
import { shuffle } from "./acak";
import { greenStrength, isDue, statusOf, type Status } from "./fsrs";

/** kanji yang aktif: tingkat terpilih dan semua tingkat di bawahnya */
export const aktif = (d: Pick<AppData, "tg">) =>
  KANJI.filter((x) => URUT[x.tingkat] <= URUT[d.tg || "N5"] && bisaDipelajari(x.kanji));

/** kanji yang lolos hitungan 5x benar dan menunggu sesi menulis */
export const daftarTulis = (data: AppData): string[] =>
  aktif(data).map((x) => x.kanji).filter((k) => data.ks[k]?.readyWrite && !data.ks[k]?.green);

// Jenis soal bergiliran: arti, bacaan, rakit, lalu ulang (menurut hitungan benar).
// Kanji hijau (review jangka panjang) selalu rakit.
const GILIRAN: JenisSoal[] = ["meaning", "reading", "rakit"];

function jenisUntuk(k: string, s: KanjiState | undefined): JenisSoal {
  const st = statusOf(s);
  const jenis: JenisSoal = st === "green" ? "rakit" : GILIRAN[(s?.count || 0) % GILIRAN.length]!;
  // Kanji tanpa kosakata yang bisa dirakit (mis. 叔, 綿: hanya bacaan khusus) tetap
  // dilatih lewat soal arti/bacaan, bukan soal rakit yang tidak bisa diselesaikan.
  if (jenis === "rakit" && !bisaRakit(k)) return (s?.count || 0) % 2 === 0 ? "meaning" : "reading";
  return jenis;
}

export function buildSession(data: AppData, t: string, mode: ModeSesi): RencanaSesi {
  const ks = data.ks;
  const all = aktif(data).map((x) => x.kanji);
  const by = (st: Status) => all.filter((k) => statusOf(ks[k]) === st);

  if (mode === "review") {
    const greens = by("green")
      .filter((k) => ks[k]!.lastSeen !== t)
      .sort((a, b) => greenStrength(ks[a]!, t) - greenStrength(ks[b]!, t));
    return { quiz: greens.slice(0, 10).map((k) => ({ k, type: jenisUntuk(k, ks[k]) })), write: [] };
  }

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
  const redDue = by("red").filter((k) => ks[k]!.lastSeen !== t);
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
  if (acc === null || acc >= 0.7) take(whites, Math.max(0, 10 - pick.length));

  const items: ItemSoal[] = shuffle(pick).map((k) => ({ k, type: jenisUntuk(k, ks[k]) }));
  // sesi selalu ditutup dengan soal yang paling mungkin dijawab benar
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

  return { quiz: items, write: daftarTulis(data) };
}
