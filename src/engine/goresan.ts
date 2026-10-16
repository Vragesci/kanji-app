// Pengecekan tulisan tangan per goresan (2026-10-16), memakai data urutan goresan KanjiVG
// (https://kanjivg.tagaini.net, © Ulrich Apel, CC BY-SA 3.0). Data disiapkan oleh scripts/goresan.mjs.
import { svgPathProperties } from "svg-path-properties";
import type { Tingkat } from "../types";

export type Titik = [number, number];
export type Goresan = Titik[];

/** jumlah titik per goresan saat dibandingkan */
const N = 24;
/**
 * Toleransi (satuan: ukuran kanji = 1). Tiap goresan dinilai dari dua hal terpisah:
 * BENTUK (arah dan lengkung, setelah posisinya disamakan) dan LETAK (jarak titik tengah goresan).
 * Dipisah karena tulisan jari di HP paling sering meleset letaknya, bukan bentuknya.
 */
export const BATAS = { bentuk: 0.12, letak: 0.25, urutan: 0.07 };

export type Hasil =
  | { ok: true }
  | { ok: false; jenis: "jumlah"; ditulis: number; seharusnya: number }
  | { ok: false; jenis: "arah"; ke: number }
  | { ok: false; jenis: "urutan"; ke: number; mirip: number }
  | { ok: false; jenis: "bentuk"; ke: number };

/** titik-titik sepanjang satu jalur SVG KanjiVG (koordinat 0–109) */
export function sampelJalur(d: string, n = N): Goresan {
  const p = new svgPathProperties(d);
  const total = p.getTotalLength();
  return Array.from({ length: n }, (_, i) => {
    const t = p.getPointAtLength(n === 1 ? 0 : (total * i) / (n - 1));
    return [t.x, t.y] as Titik;
  });
}

/** sampel ulang goresan murid menjadi `n` titik berjarak sama sepanjang lintasannya */
export function sampelUlang(g: Goresan, n = N): Goresan {
  if (g.length === 0) return [];
  if (g.length === 1) return Array.from({ length: n }, () => [...g[0]!] as Titik);
  const pj = [0];
  for (let i = 1; i < g.length; i++) pj.push(pj[i - 1]! + Math.hypot(g[i]![0] - g[i - 1]![0], g[i]![1] - g[i - 1]![1]));
  const total = pj.at(-1)!;
  if (total === 0) return Array.from({ length: n }, () => [...g[0]!] as Titik);
  const hasil: Goresan = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (total * i) / (n - 1);
    while (j < g.length - 2 && pj[j + 1]! < s) j++;
    const seg = pj[j + 1]! - pj[j]! || 1;
    const t = Math.min(1, Math.max(0, (s - pj[j]!) / seg));
    hasil.push([g[j]![0] + (g[j + 1]![0] - g[j]![0]) * t, g[j]![1] + (g[j + 1]![1] - g[j]![1]) * t]);
  }
  return hasil;
}

/** samakan posisi dan ukuran: pusat kotak pembatas ke (0,0), sisi terpanjang = 1 */
export function normalisasi(gs: Goresan[]): Goresan[] {
  const semua = gs.flat();
  const xs = semua.map((p) => p[0]);
  const ys = semua.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const skala = Math.max(x1 - x0, y1 - y0) || 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return gs.map((g) => g.map(([x, y]) => [(x - cx) / skala, (y - cy) / skala] as Titik));
}

const pusat = (g: Goresan): Titik => [g.reduce((t, p) => t + p[0], 0) / g.length, g.reduce((t, p) => t + p[1], 0) / g.length];

/** beda bentuk dua goresan setelah titik tengahnya disamakan; `balik` = goresan b dibaca dari ujung */
const bedaBentuk = (a: Goresan, b: Goresan, balik = false): number => {
  const [ax, ay] = pusat(a);
  const [bx, by] = pusat(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const q = b[balik ? b.length - 1 - i : i]!;
    s += Math.hypot(a[i]![0] - ax - (q[0] - bx), a[i]![1] - ay - (q[1] - by));
  }
  return s / a.length;
};
const bedaLetak = (a: Goresan, b: Goresan): number => {
  const [ax, ay] = pusat(a);
  const [bx, by] = pusat(b);
  return Math.hypot(ax - bx, ay - by);
};

/**
 * Arah terbalik: untuk goresan yang cukup panjang (bukan titik), arah awal→akhir murid
 * berlawanan dengan arah seharusnya. Goresan pendek seperti titik (丶) tidak dinilai arahnya.
 */
const terbalik = (u: Goresan, t: Goresan): boolean => {
  const tx = t.at(-1)![0] - t[0]![0], ty = t.at(-1)![1] - t[0]![1];
  const ux = u.at(-1)![0] - u[0]![0], uy = u.at(-1)![1] - u[0]![1];
  const pt = Math.hypot(tx, ty), pu = Math.hypot(ux, uy);
  if (pt < 0.15 || pu < 0.05) return false;
  return (tx * ux + ty * uy) / (pt * pu) < -0.5;
};

const cacheJalur = new Map<string, Goresan>();
const sampelTersimpan = (d: string): Goresan => {
  let g = cacheJalur.get(d);
  if (!g) { g = sampelJalur(d); cacheJalur.set(d, g); }
  return g;
};

/**
 * Menilai tulisan murid terhadap jalur KanjiVG. Urutan pemeriksaan: jumlah goresan, lalu tiap goresan
 * berurutan — bentuknya (searah) dan letaknya harus cocok dengan goresan yang seharusnya.
 */
export function nilaiTulisan(murid: Goresan[], jalur: string[], batas = BATAS): Hasil {
  const tulis = murid.filter((g) => g.length > 0);
  if (tulis.length !== jalur.length) return { ok: false, jenis: "jumlah", ditulis: tulis.length, seharusnya: jalur.length };
  const T = normalisasi(jalur.map(sampelTersimpan));
  const U = normalisasi(tulis.map((g) => sampelUlang(g)));
  const cocok = (u: Goresan, t: Goresan) => bedaBentuk(u, t) <= batas.bentuk && bedaLetak(u, t) <= batas.letak;
  for (let i = 0; i < U.length; i++) {
    const u = U[i]!;
    if (terbalik(u, T[i]!)) return { ok: false, jenis: "arah", ke: i + 1 };
    if (cocok(u, T[i]!)) continue;
    if (bedaBentuk(u, T[i]!, true) <= batas.bentuk && bedaLetak(u, T[i]!) <= batas.letak) return { ok: false, jenis: "arah", ke: i + 1 };
    const j = T.findIndex((t, x) => x !== i && cocok(u, t));
    if (j >= 0) return { ok: false, jenis: "urutan", ke: i + 1, mirip: j + 1 };
    return { ok: false, jenis: "bentuk", ke: i + 1 };
  }
  // Semua goresan cocok di tempatnya, tapi apakah urutan lain jauh lebih pas? (mis. garis sejajar 三 tertukar)
  const biaya = U.map((u) => T.map((t) => bedaBentuk(u, t) + bedaLetak(u, t)));
  const p = penugasanTermurah(biaya);
  const pindah = p.map((j, i) => [i, j] as const).filter(([i, j]) => i !== j);
  if (pindah.length) {
    const hemat = pindah.reduce((s, [i, j]) => s + biaya[i]![i]! - biaya[i]![j]!, 0) / pindah.length;
    if (hemat > batas.urutan) return { ok: false, jenis: "urutan", ke: pindah[0]![0] + 1, mirip: pindah[0]![1] + 1 };
  }
  return { ok: true };
}

/** algoritma Hungaria: pasangan baris→kolom dengan total biaya terkecil (n ≤ ±30 goresan) */
function penugasanTermurah(c: number[][]): number[] {
  const n = c.length;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = c[i0 - 1]![j - 1]! - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const hasil = new Array(n).fill(0);
  for (let j = 1; j <= n; j++) hasil[p[j] - 1] = j - 1;
  return hasil;
}

/** pesan koreksi untuk murid */
export function pesanKoreksi(h: Hasil): string {
  if (h.ok) return "Benar! Bentuk, urutan, dan arah goresanmu sudah tepat.";
  switch (h.jenis) {
    case "jumlah":
      return `Jumlah goresanmu ${h.ditulis}, seharusnya ${h.seharusnya}.`;
    case "arah":
      return `Goresan ke-${h.ke} arahnya terbalik.`;
    case "urutan":
      return `Urutan goresan belum tepat: goresan ke-${h.ke} yang kamu tulis seharusnya goresan ke-${h.mirip}.`;
    case "bentuk":
      return `Goresan ke-${h.ke} bentuk atau letaknya belum tepat.`;
  }
}

const tembolok = new Map<Tingkat, Promise<Record<string, string[]>>>();

/** jalur goresan semua kanji satu tingkat (sekitar 50–330 KB, ikut disimpan untuk luring) */
export function muatGoresan(tg: Tingkat): Promise<Record<string, string[]>> {
  let p = tembolok.get(tg);
  if (!p) {
    p = fetch(`/goresan/${tg}.json`).then((r) => {
      if (!r.ok) throw new Error(`data goresan ${tg} tidak bisa dimuat`);
      return r.json() as Promise<Record<string, string[]>>;
    });
    p.catch(() => tembolok.delete(tg));
    tembolok.set(tg, p);
  }
  return p;
}
