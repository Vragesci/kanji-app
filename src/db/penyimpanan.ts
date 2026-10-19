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

export const KOSONG: AppData = { ks: {}, seq: 0, offset: 0, lastAcc: null, log: [], tg: "N5" };

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
  return { ...KOSONG, ...(meta || {}), ks };
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
