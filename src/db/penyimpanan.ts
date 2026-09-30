import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppData, KanjiState } from "../types";

// IndexedDB, bukan localStorage: datanya besar (satu rekaman per kanji, 1.377 kanji).
// `kanji`: kunci = huruf kanji, nilai = KanjiState. `meta`: satu rekaman "app".
type Meta = Omit<AppData, "ks">;

interface Skema extends DBSchema {
  kanji: { key: string; value: KanjiState };
  meta: { key: string; value: Meta };
}

const NAMA_DB = "kanji-app";
const VERSI = 1;

export const KOSONG: AppData = { ks: {}, offset: 0, lastAcc: null, log: [], tg: "N5", ujian: null };

/**
 * Id acak untuk entri log. crypto.randomUUID butuh konteks aman dan tidak ada
 * di sebagian peramban Android lama, jadi ada dua tingkat cadangan. Kolom
 * `log_sesi.id` di Supabase bertipe text, bukan uuid, supaya bentuk apa pun
 * dari cadangan ini tetap bisa disimpan.
 */
export const idBaru = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch { /* lanjut ke cadangan terakhir */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * Melengkapi data yang ditulis sebelum Tahap 2: rekaman kanji belum punya
 * `diubah` dan entri log belum punya `id`.
 *
 * Rekaman lama distempel dengan waktu pemuatan ini, bukan dengan tanggal
 * paling tua. Alasannya: murid yang sudah belajar sebelum ada akun tidak boleh
 * kalah oleh data server yang lebih tua saat pertama kali masuk — kemajuannya
 * nyata dan ada di perangkat ini.
 */
function lengkapi(d: AppData): AppData {
  const sekarang = new Date().toISOString();
  let berubah = false;

  const ks: Record<string, KanjiState> = {};
  for (const [k, v] of Object.entries(d.ks)) {
    if (v.diubah) { ks[k] = v; continue; }
    ks[k] = { ...v, diubah: sekarang };
    berubah = true;
  }

  const log = d.log.map((e) => {
    if (e.id) return e;
    berubah = true;
    return { ...e, id: idBaru() };
  });

  const metaDiubah = d.metaDiubah ?? sekarang;
  if (!d.metaDiubah) berubah = true;

  return berubah ? { ...d, ks, log, metaDiubah } : d;
}

let dbPromise: Promise<IDBPDatabase<Skema>> | null = null;
const buka = () =>
  (dbPromise ??= openDB<Skema>(NAMA_DB, VERSI, {
    upgrade(db, versiLama) {
      // bersyarat menurut versi lama: menaikkan VERSI kelak tidak boleh membuat ulang store yang sudah ada
      if (versiLama < 1) {
        db.createObjectStore("kanji");
        db.createObjectStore("meta");
      }
    },
  }));

const pisahMeta = ({ ks: _ks, ...meta }: AppData): Meta => meta;

export async function muat(): Promise<AppData> {
  const db = await buka();
  const [meta, keys, values] = await Promise.all([
    db.get("meta", "app"),
    db.getAllKeys("kanji"),
    db.getAll("kanji"),
  ]);
  const ks: Record<string, KanjiState> = {};
  keys.forEach((k, i) => { ks[k] = values[i]!; });
  return lengkapi({ ...KOSONG, ...(meta || {}), ks });
}

/** Menulis hanya bagian yang berubah antara `lama` dan `baru`. */
export async function simpan(lama: AppData, baru: AppData): Promise<void> {
  const db = await buka();
  const tx = db.transaction(["kanji", "meta"], "readwrite");
  const kanji = tx.objectStore("kanji");
  const meta = tx.objectStore("meta");
  const ops: Promise<unknown>[] = [];
  for (const k of Object.keys(baru.ks)) {
    if (baru.ks[k] !== lama.ks[k]) ops.push(kanji.put(baru.ks[k]!, k));
  }
  for (const k of Object.keys(lama.ks)) {
    if (!(k in baru.ks)) ops.push(kanji.delete(k));
  }
  const mb = pisahMeta(baru);
  const ml = pisahMeta(lama);
  if ((Object.keys(mb) as (keyof Meta)[]).some((f) => mb[f] !== ml[f])) ops.push(meta.put(mb, "app"));
  ops.push(tx.done);
  await Promise.all(ops);
}

/** Minta browser tidak menghapus data saat penyimpanan perangkat menipis. */
export async function mintaPenyimpananTetap(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* tidak kritis */ }
}
