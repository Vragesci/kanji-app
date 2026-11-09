import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppData, KanjiState, Peristiwa } from "../types";
import { MAKS_PERISTIWA } from "../engine/peristiwa";

// IndexedDB, bukan localStorage: datanya besar (satu rekaman per kanji, 1.377 kanji).
// `kanji`: kunci = huruf kanji, nilai = KanjiState. `meta`: satu rekaman "app".
// `peristiwa`: log belajar per soal (Tahap 1b), kunci berurut otomatis.
type Meta = Omit<AppData, "ks">;

interface Skema extends DBSchema {
  kanji: { key: string; value: KanjiState };
  meta: { key: string; value: Meta };
  peristiwa: { key: number; value: Peristiwa };
}

const NAMA_DB = "kanji-app";
const VERSI = 2;

export const KOSONG: AppData = { ks: {}, offset: 0, lastAcc: null, log: [], tg: "N5" };

let dbPromise: Promise<IDBPDatabase<Skema>> | null = null;
const buka = () =>
  (dbPromise ??= openDB<Skema>(NAMA_DB, VERSI, {
    upgrade(db, versiLama) {
      // bersyarat menurut versi lama: menaikkan VERSI kelak tidak boleh membuat ulang store yang sudah ada
      if (versiLama < 1) {
        db.createObjectStore("kanji");
        db.createObjectStore("meta");
      }
      if (versiLama < 2) db.createObjectStore("peristiwa", { autoIncrement: true });
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

// ——— Log belajar per soal (Tahap 1b) ———
// Dipisah dari `simpan`: log ini hanya bertambah, tidak pernah ikut selisih AppData, dan
// kegagalannya tidak boleh menggagalkan penyimpanan kemajuan murid.

/** dipangkas setelah kelebihan sekian baris, bukan tiap baris, supaya tidak menyapu tiap jawaban */
const KELONGGARAN = 200;
let jumlah: number | null = null;

/**
 * Menambah satu baris log dan memangkas yang tertua kalau sudah lewat batas.
 * Pemanggil wajib mengabaikan kegagalannya — mencatat tidak boleh menghentikan sesi.
 */
export async function catatPeristiwa(p: Peristiwa): Promise<void> {
  const db = await buka();
  const tx = db.transaction("peristiwa", "readwrite");
  const store = tx.objectStore("peristiwa");
  await store.add(p);
  jumlah = jumlah === null ? await store.count() : jumlah + 1;
  if (jumlah > MAKS_PERISTIWA + KELONGGARAN) {
    let sisa = jumlah - MAKS_PERISTIWA;
    let kursor = await store.openKeyCursor();
    while (kursor && sisa > 0) {
      await store.delete(kursor.primaryKey);
      sisa--;
      kursor = await kursor.continue();
    }
    jumlah = MAKS_PERISTIWA;
  }
  await tx.done;
}

/** Seluruh log, terlama lebih dulu (kunci autoIncrement = urutan penulisan). */
export async function ambilPeristiwa(): Promise<Peristiwa[]> {
  const db = await buka();
  return db.getAll("peristiwa");
}

/** Dipakai saat murid mematikan saklar "Bantu tingkatkan aplikasi ini". */
export async function hapusPeristiwa(): Promise<void> {
  const db = await buka();
  await db.clear("peristiwa");
  jumlah = 0;
}

/** Minta browser tidak menghapus data saat penyimpanan perangkat menipis. */
export async function mintaPenyimpananTetap(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* tidak kritis */ }
}
