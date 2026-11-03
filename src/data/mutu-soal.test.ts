/**
 * Tes regresi mutu soal (audit 2026-11-03).
 *
 * Membangkitkan soal untuk SEMUA kanji yang bisa dipelajari di tiap tingkat lewat fungsi asli
 * (`kosakataUntuk`, `pengecohArti`, `pengecohBacaan`), lalu menghitung berapa soal yang bisa
 * dijawab tanpa tahu kanjinya, berapa yang punya dua jawaban benar, dan berapa yang isinya salah.
 *
 * Cara kerja ambang: `BATAS` di bawah adalah jumlah temuan pada commit ba9b8a0. Tes GAGAL kalau
 * angkanya NAIK. Kalau Anda memperbaiki sesuatu dan angkanya turun, turunkan juga angka di `BATAS`
 * — supaya perbaikan itu tidak bisa diam-diam hilang lagi.
 *
 * Pengecoh memakai angka acak, jadi tiap soal dibangkitkan beberapa kali. `ULANG=3` dipakai di CI
 * supaya cepat; untuk audit menyeluruh jalankan `ULANG=10 npx vitest run src/data/mutu-soal`.
 *
 * `Math.random` diganti PRNG berseed selama tes: tanpa itu jumlah temuan berayun belasan angka
 * antar-jalankan (terukur A2: 237 lalu 252 pada kode yang sama), dan ambang yang berayun membuat
 * CI gagal secara acak — lebih buruk daripada tidak ada gerbang sama sekali. Dengan seed tetap,
 * angka yang sama selalu menghasilkan hasil yang sama, jadi kenaikan berarti kode yang berubah.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KAMUS, KANJI, KMAP, SEMUA_KATA, TINGKAT, URUT, bisaDipelajari, bisaRakit, kataTulis, kosakataUntuk, layak } from "./katalog";
import { ekorKata, kelasKata, pengecohArti, pengecohBacaan } from "./pengecoh";
import { jenisUntuk } from "../engine/sesi";
import type { Kosakata, Tingkat } from "../types";
// data goresan diimpor langsung, bukan dibaca lewat node:fs: proyek ini tidak memasang
// @types/node, dan tes tidak perlu memaksa konfigurasi TypeScript berubah
import goresanN5 from "../../public/goresan/N5.json";
import goresanJFT from "../../public/goresan/JFT.json";
import goresanN3 from "../../public/goresan/N3.json";
import goresanN2 from "../../public/goresan/N2.json";
import goresanN1 from "../../public/goresan/N1.json";

const GORESAN: Record<Tingkat, Record<string, string[]>> = {
  N5: goresanN5, JFT: goresanJFT, N3: goresanN3, N2: goresanN2, N1: goresanN1,
};

// ULANG dibaca dari lingkungan tanpa @types/node: `ULANG=10 npx vitest run src/data/mutu-soal`
const ULANG = Number(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ULANG ?? 3,
);

/** PRNG mulberry32 — kecil, cukup bagus, dan hasilnya sama di mesin mana pun */
const mulberry32 = (benih: number) => () => {
  benih = (benih + 0x6d2b79f5) | 0;
  let t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const BENIH = 20261103;

/**
 * Jumlah temuan pada commit ba9b8a0 ("Mutu soal: tutup lima cacat yang ditemukan audit")
 * dengan ULANG=10 dan benih 20261103. Angka dengan ULANG lebih kecil selalu lebih rendah
 * (terukur ULANG=3: A2 118, A5 26), jadi ambang ini aman dipakai di CI.
 * ANGKA HANYA BOLEH TURUN.
 *
 * Angka dalam kurung = keadaan di commit 9bb5a9b, sebelum lima perbaikan itu. Ambang di bawah
 * mengunci perbaikan tersebut: menaikkannya kembali berarti membatalkan kerja yang sudah selesai.
 */
const BATAS = {
  /** A1 — ekor okurigana membocorkan jawaban. Nol sejak perbaikan ekor 2026-11-03 (0). */
  A1_ekor_bocor: 0,
  /** A2 — jawaban benar satu-satunya dengan panjang/mora itu (557 → 245 sesudah pencocokan
   *  per mora). Sisanya kata yang memang tidak punya cukup pembanding semora di data. */
  A2_panjang_bocor: 245,
  /** A3 — hanya jawaban benar yang memuat katakana/ー/ゃゅょ (307 → 2). */
  A3_bentuk_bocor: 2,
  /** A4 — kelas kata membocorkan jawaban. Satu-satunya kasus (近く) adalah salah klasifikasi
   *  `kelasKata`, yang menilai kata berakhiran く sebagai kata kerja (1). */
  A4_kelas_bocor: 1,
  /** A5 — panjang teks arti jomplang; belum ditangani (57 → 55). */
  A5_panjang_arti: 55,
  /** B6 — pengecoh bacaan yang sah juga untuk tulisan yang sama, 人/～人 (6 → 0, lewat `intiKata`). */
  B6_bacaan_sah: 0,
  /** B7 — dua pilihan arti yang bermakna sama, 割れる/壊れる (13 → 0). */
  B7_arti_bertumpuk: 0,
  /** B8 — pengecoh identik sesudah spasi/kapital diabaikan, 係 (1 → 0). */
  B8_identik: 0,
  /** C9 — kata tidak memuat kanji targetnya. BERSIH (0). */
  C9_tanpa_target: 0,
  /** C10 — arti kosong / perlu_terjemahan / masih berhuruf Jepang, 似顔 (1 → 0). */
  C10_arti_rusak: 0,
  /** C11 — kana tidak cocok dengan gabungan seg, ～曜日/～月/～日 (3 → 0). */
  C11_kana_vs_seg: 0,
  /** C12 — soal rakit tanpa segmen target atau memakai seg_valid=false. BERSIH (0). */
  C12_rakit_salah: 0,
  /** C18 — pilihan rusak: batang dipotong di tengah （な） → げんき（（な） (10 → 0). */
  C18_pilihan_rusak: 0,
  /** D15 — kanji tanpa data goresan. BERSIH. */
  D15_tanpa_goresan: 0,
  // D16 (soal tulis ambigu, mis. 午後 → "tulis kanji untuk ご") SENGAJA TIDAK DIPERIKSA.
  // Audit sempat melaporkannya, lalu ditolak setelah diperiksa: komponen `Petunjuk` di
  // SoalTulis.tsx menampilkan kanji target sebagai kotak putus-putus (午□), jadi posisi yang
  // diminta sudah jelas walau kedua kanjinya sama-sama dibaca ご.
} as const;

type Kunci = keyof typeof BATAS;
const n: Record<Kunci, number> = Object.fromEntries(Object.keys(BATAS).map((k) => [k, 0])) as Record<Kunci, number>;
const terlihat = new Set<string>();
const catat = (k: Kunci, id: string) => {
  if (terlihat.has(`${k}|${id}`)) return;
  terlihat.add(`${k}|${id}`);
  n[k]++;
};

const adaKatakana = (s: string) => /[ァ-ヶ]/.test(s);
const adaKecil = (s: string) => /[ゃゅょ]/.test(s);
const adaChouon = (s: string) => s.includes("ー");
const mora = (k: string) => [...k].filter((c) => !"ゃゅょ".includes(c)).length;
const tanpaSpasi = (s: string) => s.toLowerCase().replace(/\s+/g, "");
const isKanjiCh = (c: string) => /[㐀-鿿豈-﫿]/.test(c);
const tanpaKurung = (s: string) => s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
const glosa = (s: string) => tanpaKurung(s).toLowerCase().split(/[,;/]|\batau\b/).map((x) => x.trim()).filter((x) => x.length > 2);
const jmlKata = (s: string) => tanpaKurung(s).replace(/[,;/]/g, " ").split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const skel = (s: string) => [...s].filter(isKanjiCh).join("");
/** tulisan yang efektif sama: 人 / ～人, 元気 / 元気（な） */
const bentuk = (s: string) => s.replace(/[～（）な]/g, "");

const ARTI_KE_KATA = new Map<string, { kata: string; v: Kosakata }[]>();
for (const x of SEMUA_KATA) {
  const k = norm(x.v.arti);
  if (!ARTI_KE_KATA.has(k)) ARTI_KE_KATA.set(k, []);
  ARTI_KE_KATA.get(k)!.push(x);
}
const SKEL_KE_KATA = new Map<string, { kata: string; v: Kosakata }[]>();
for (const x of SEMUA_KATA) {
  const s = skel(x.kata);
  if (!s) continue;
  if (!SKEL_KE_KATA.has(s)) SKEL_KE_KATA.set(s, []);
  SKEL_KE_KATA.get(s)!.push(x);
}
const saudaraBentuk = (kata: string) =>
  (SKEL_KE_KATA.get(skel(kata)) ?? []).filter((y) => y.kata !== kata && bentuk(y.kata) === bentuk(kata));

/** kelas kata pengecoh hanya bisa ditebak dari artinya; kalau kata sumbernya tidak sepakat, lewati */
const kelasDariArti = (arti: string): string | null => {
  const l = ARTI_KE_KATA.get(norm(arti));
  if (!l?.length) return null;
  const kelas = new Set(l.map((x) => kelasKata(x.kata, x.v)));
  return kelas.size === 1 ? [...kelas][0]! : null;
};

describe("mutu soal", () => {
  // Math.random diganti langsung, BUKAN lewat vi.spyOn: spy mencatat riwayat setiap panggilan,
  // dan tes ini memanggil Math.random jutaan kali — riwayatnya menghabiskan memori sampai
  // worker Vitest mati dengan SIGABRT.
  const acakAsli = Math.random;
  beforeAll(() => { Math.random = mulberry32(BENIH); });
  afterAll(() => { Math.random = acakAsli; });

  it(`tidak ada kemunduran mutu soal (ULANG=${ULANG}, benih=${BENIH})`, () => {
    // ---- data kosakata ----
    for (const [kata, v] of Object.entries(KAMUS)) {
      if (!v.arti) continue;
      if (/perlu_terjemahan/i.test(v.arti) || /^[?\-\s]*$/.test(v.arti) || /[ぁ-んァ-ヶ㐀-鿿]/.test(v.arti)) {
        catat("C10_arti_rusak", kata);
      }
      if (v.seg_valid && v.seg.map((s) => s[1] || s[0]).join("") !== v.kana) catat("C11_kana_vs_seg", kata);
    }

    // ---- soal tulis ----
    const goresan: Record<string, Set<string>> = {};
    for (const tg of TINGKAT) goresan[tg] = new Set(Object.keys(GORESAN[tg] ?? {}));
    for (const x of KANJI) {
      if (!bisaDipelajari(x.kanji)) continue;
      if (!goresan[x.tingkat]?.has(x.kanji)) catat("D15_tanpa_goresan", x.kanji);
      // kata soal tulis harus ada di kamus dan memuat kanji targetnya
      const kt = kataTulis(x.kanji, "N1");
      expect(KAMUS[kt], `kataTulis(${x.kanji}) = ${kt}`).toBeDefined();
      expect([...kt].includes(x.kanji), `kataTulis(${x.kanji}) = ${kt} tidak memuat kanjinya`).toBe(true);
    }

    // ---- soal per tingkat ----
    for (const tg of TINGKAT) {
      for (const x of KANJI) {
        if (URUT[x.tingkat] > URUT[tg] || !bisaDipelajari(x.kanji)) continue;
        const k = x.kanji;
        for (let r = 0; r < ULANG; r++) {
          for (const jenis of ["meaning", "reading", "rakit"] as const) {
            if (jenis === "rakit" && !bisaRakit(k)) continue;
            let kata: string;
            try { kata = kosakataUntuk(k, r, jenis === "rakit", undefined, tg); } catch { continue; }
            const v = KAMUS[kata];
            if (!v) continue;
            const id = `${k}|${kata}|${jenis}`;
            if (![...kata].includes(k)) catat("C9_tanpa_target", id);

            if (jenis === "rakit") {
              if (!v.seg_valid || !v.seg.some((s) => s[0] === k)) catat("C12_rakit_salah", id);
              continue;
            }

            const benar = jenis === "meaning" ? v.arti : v.kana;
            const opsi = jenis === "meaning" ? [v.arti, ...pengecohArti(kata, v)] : [v.kana, ...pengecohBacaan(kata, v)];
            const peng = opsi.filter((o) => o !== benar);
            if (peng.length !== 3) continue;

            for (const p of peng) if (tanpaSpasi(p) === tanpaSpasi(benar)) catat("B8_identik", id);

            if (jenis === "reading") {
              const ekor = ekorKata(kata, v);
              if (ekor && peng.every((p) => !p.endsWith(ekor))) catat("A1_ekor_bocor", id);
              if (peng.every((p) => mora(p) !== mora(benar)) || peng.every((p) => [...p].length !== [...benar].length)) {
                catat("A2_panjang_bocor", id);
              }
              for (const uji of [adaKatakana, adaChouon, adaKecil]) {
                if (uji(benar) && peng.every((p) => !uji(p))) catat("A3_bentuk_bocor", id);
              }
              // pilihan yang bentuknya rusak: batang dipotong di tengah （な）
              for (const p of peng) {
                const buka = (p.match(/（/g) ?? []).length;
                const tutup = (p.match(/）/g) ?? []).length;
                if (buka !== tutup || buka > 1 || (buka === 1 && !p.endsWith("（な）"))) catat("C18_pilihan_rusak", id);
                else if (/^[ゃゅょっんー]|っ$|ーー/.test(p)) catat("C18_pilihan_rusak", id);
              }
              const saud = saudaraBentuk(kata);
              for (const p of peng) if (saud.some((y) => y.v.kana === p || bentuk(y.v.kana) === bentuk(p))) catat("B6_bacaan_sah", id);
            } else {
              const kB = kelasKata(kata, v);
              const kP = peng.map(kelasDariArti);
              if (kP.every(Boolean)) {
                const kerja = (z: string | null) => z === "kerja";
                if (kerja(kB) !== kP.some(kerja) && kP.every((z) => kerja(z) !== kerja(kB))) catat("A4_kelas_bocor", id);
              }
              const wB = jmlKata(benar);
              const wP = peng.map(jmlKata);
              if ((wB >= 3 && wP.every((w) => w === 1)) || (wB === 1 && wP.every((w) => w >= 3))) catat("A5_panjang_arti", id);
              const gB = new Set(glosa(benar));
              for (const p of peng) if (glosa(p).some((g) => gB.has(g))) catat("B7_arti_bertumpuk", id);
              const saud = saudaraBentuk(kata);
              for (const p of peng) if (saud.some((y) => norm(y.v.arti) === norm(p))) catat("B7_arti_bertumpuk", id);
            }
          }
        }
      }
    }

    const naik = (Object.keys(BATAS) as Kunci[]).filter((k) => n[k] > BATAS[k]);
    expect(
      naik.map((k) => `${k}: ${n[k]} > ambang ${BATAS[k]}`).join("\n"),
      `Mutu soal mundur. Perbaiki, atau kalau memang disengaja, naikkan ambangnya di BATAS beserta alasannya.\nHitungan sekarang: ${JSON.stringify(n)}`,
    ).toBe("");
  }, 900_000);

  it("kanji tanpa kosakata rakit tidak pernah diberi soal rakit", () => {
    for (const x of KANJI) {
      if (!bisaDipelajari(x.kanji) || bisaRakit(x.kanji)) continue;
      for (let i = 0; i < 6; i++) {
        const j = jenisUntuk(x.kanji, { seen: true, vi: 0, count: i, wrongStreak: 0, green: true }, i);
        expect(j, `${x.kanji} (hijau, tidak bisa dirakit)`).not.toBe("rakit");
      }
    }
  });

  it("setiap kanji yang bisa dipelajari punya kosakata berarti", () => {
    for (const x of KANJI) {
      if (!bisaDipelajari(x.kanji)) continue;
      expect(KMAP[x.kanji]!.kosakata.some(layak), x.kanji).toBe(true);
    }
  });
});
