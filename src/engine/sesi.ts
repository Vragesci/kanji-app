import type { AppData, ItemSoal, JenisSoal, KanjiState, RencanaSesi } from "../types";
import { KANJI, URUT, bisaDipelajari, bisaRakit, kosakataUntuk } from "../data/katalog";
import { shuffle } from "./acak";
import { isDue, statusOf } from "./fsrs";

/** satu sesi = 10 soal (metode 1) */
export const KUOTA = 10;
/**
 * Batas kanji yang sudah dilihat tapi belum hijau (merah, oranye, dan yang menunggu sesi menulis).
 * Tanpa batas ini antreannya menumpuk: kanji baru terus ditambah 2–3 per sesi sementara yang lama
 * belum tuntas, sehingga satu sesi tidak cukup untuk melatih semuanya dan tidak ada kanji yang
 * pernah mencapai benar 5 kali. Satu sesi penuh adalah batas yang wajar: semua kanji yang sedang
 * dipelajari masih bisa dilatih dalam satu sesi.
 */
export const PROSES_MAKS = 10;
/** review hijau (FSRS) per sesi: dibatasi supaya tidak menutup jatah kanji yang sedang dipelajari */
export const REVIEW_MAKS = 3;
/** soal tulis per sesi: menulis jauh lebih lambat daripada memilih jawaban */
export const TULIS_MAKS = 5;
/**
 * Cek tulis untuk kanji yang sudah hijau lewat tes penempatan: maksimum 2 per sesi. Murid yang
 * lulus satu tingkat bisa punya ratusan kanji seperti itu; tanpa batas ini, cek tulis akan
 * menutup jatah menulis kanji yang baru saja dituntaskan murid.
 */
export const CEK_MAKS = 2;

/** kanji yang aktif: tingkat terpilih dan semua tingkat di bawahnya */
export const aktif = (d: Pick<AppData, "tg">) =>
  KANJI.filter((x) => URUT[x.tingkat] <= URUT[d.tg || "N5"] && bisaDipelajari(x.kanji));

/**
 * Kanji yang menunggu sesi menulis, maksimum TULIS_MAKS per sesi, yang paling lama menunggu di
 * depan. Dua lapis:
 *
 * 1. Belum hijau — lolos hitungan 5x benar, atau ditandai "sudah tahu" oleh murid. Baru hijau
 *    setelah tulisannya benar, jadi ini didahulukan.
 * 2. Sudah hijau lewat tes penempatan — cuma pengecekan bahwa murid memang hafal, jadi hanya
 *    mengisi sisa slot, maksimum CEK_MAKS per sesi.
 */
export const daftarTulis = (data: AppData): string[] => {
  const menunggu = aktif(data).map((x) => x.kanji).filter((k) => data.ks[k]?.readyWrite);
  const urut = (a: string, b: string) => (data.ks[a]!.seq || 0) - (data.ks[b]!.seq || 0);
  const wajib = menunggu.filter((k) => !data.ks[k]!.green).sort(urut).slice(0, TULIS_MAKS);
  const cek = menunggu.filter((k) => data.ks[k]!.green).sort(urut).slice(0, CEK_MAKS);
  return [...wajib, ...cek].slice(0, TULIS_MAKS);
};

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
function rakitItems(list: string[], data: Pick<AppData, "ks" | "tg">): ItemSoal[] {
  const ks = data.ks;
  const dipakai = new Set<string>();
  return shuffle(list).map((k, idx) => {
    const type = jenisUntuk(k, ks[k], idx);
    const kata = kosakataUntuk(k, ks[k]?.vi || 0, type === "rakit", dipakai, data.tg || "N5");
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
  const items = rakitItems(pilihan.slice(0, KUOTA), data);
  return { quiz: tutupDenganTermudah(items, data.ks), write: [] };
}

/**
 * Menyusun satu sesi. Urutan antrean (2026-10-19):
 *
 * 1. Review hijau yang jatuh tempo (FSRS), maksimum REVIEW_MAKS.
 * 2. Kanji yang sedang dipelajari, bergilir: yang paling lama tidak dilatih di depan, lalu yang
 *    hitungan benarnya paling tinggi. Fase belajar tidak lagi memakai jarak hari, jadi tidak ada
 *    kanji yang "belum jatuh tempo" dan tertahan di belakang antrean.
 * 3. Kanji baru sebanyak jatah ketepatan (metode 6), hanya kalau jumlah kanji yang belum hijau
 *    masih di bawah PROSES_MAKS.
 */
export function buildSession(data: AppData, t: string): RencanaSesi {
  const ks = data.ks;
  const all = aktif(data).map((x) => x.kanji);
  const st = (k: string) => statusOf(ks[k]);

  const proses = all
    .filter((k) => (st(k) === "red" || st(k) === "orange") && !ks[k]!.readyWrite)
    .sort((a, b) => (ks[a]!.seq || 0) - (ks[b]!.seq || 0) || (ks[b]!.count || 0) - (ks[a]!.count || 0));
  const greenDue = all
    .filter((k) => st(k) === "green" && isDue(ks[k]!, t))
    .sort((a, b) => ks[a]!.due!.localeCompare(ks[b]!.due!));
  const putih = all.filter((k) => st(k) === "white");
  // termasuk kanji yang menunggu sesi menulis: kalau soal tulis menumpuk, kanji baru ikut ditahan
  const belumHijau = all.filter((k) => ks[k]?.seen && !ks[k]!.green).length;

  const acc = data.lastAcc;
  // beban menyesuaikan ketepatan sesi terakhir: <70% tanpa kanji baru, >90% tiga kanji baru
  const jatah = acc === null ? 2 : acc < 0.7 ? 0 : acc > 0.9 ? 3 : 2;
  const ruang = Math.max(0, PROSES_MAKS - belumHijau);
  // Antrean kosong (sesi pertama, atau semua kanji sudah tuntas): kuota diisi kanji baru supaya
  // sesinya tidak cuma dua soal. Ketepatan di bawah 70% tetap menahan kanji baru, tapi sesi tanpa
  // satu pun soal lebih buruk daripada dua kanji baru.
  const antreanKosong = !proses.length && !greenDue.length;
  const nBaru = Math.min(antreanKosong ? (acc !== null && acc < 0.7 ? 2 : KUOTA) : jatah, ruang);

  const pick: string[] = [];
  const take = (arr: string[], n: number) => {
    for (const k of arr) {
      if (pick.length >= KUOTA || n <= 0) break;
      if (!pick.includes(k)) { pick.push(k); n--; }
    }
  };

  take(greenDue, REVIEW_MAKS);
  take(proses, KUOTA - nBaru - pick.length); // jatah kanji baru disisakan dulu
  take(putih, nBaru);
  take(greenDue, KUOTA); // sisa kuota: review hijau lain yang jatuh tempo

  const items = tutupDenganTermudah(rakitItems(pick, data), ks);
  return { quiz: items, write: daftarTulis(data) };
}
