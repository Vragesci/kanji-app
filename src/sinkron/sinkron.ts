import type { AppData, KanjiState, LogSesi, Tingkat } from "../types";
import type { DataServer, HasilGabung } from "./gabung";
import { supabase } from "./klien";

// PostgREST membatasi jawaban 1.000 baris. Data ini sampai 1.356 kanji, jadi
// pengambilan harus berhalaman — kalau tidak, kanji terakhir hilang diam-diam.
const HALAMAN = 1000;
// Batas baris per permintaan kirim, supaya HP kelas menengah dengan sinyal
// lemah tidak mengirim satu muatan raksasa yang gagal di tengah jalan.
const SEKALI_KIRIM = 400;

type Jawaban<T> = { data: T[] | null; error: { message: string } | null };

async function semuaBaris<T>(ambil: (dari: number, sampai: number) => PromiseLike<Jawaban<T>>): Promise<T[]> {
  const hasil: T[] = [];
  for (let dari = 0; ; dari += HALAMAN) {
    const { data, error } = await ambil(dari, dari + HALAMAN - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    hasil.push(...batch);
    if (batch.length < HALAMAN) return hasil;
  }
}

interface BarisProfil {
  tg: Tingkat;
  ujian: string | null;
  offset_hari: number;
  last_acc: number | null;
  diubah: string;
  setuju_pada: string | null;
}

/** Keadaan murid menurut server. */
export async function tarik(userId: string): Promise<DataServer & { setujuPada: string | null }> {
  const sb = supabase;
  if (!sb) throw new Error("Server belum dikonfigurasi");

  const [profilJwb, barisKanji, barisLog] = await Promise.all([
    sb.from("profil").select("tg,ujian,offset_hari,last_acc,diubah,setuju_pada").eq("id", userId).maybeSingle(),
    semuaBaris<{ kanji: string; data: KanjiState; diubah: string }>((a, b) =>
      sb.from("kanji_state").select("kanji,data,diubah").eq("user_id", userId).range(a, b)),
    semuaBaris<LogSesi>((a, b) =>
      sb.from("log_sesi").select("id,d,n,acc").eq("user_id", userId).range(a, b)),
  ]);

  if (profilJwb.error) throw new Error(profilJwb.error.message);
  const p = profilJwb.data as BarisProfil | null;

  const ks: DataServer["ks"] = {};
  for (const b of barisKanji) ks[b.kanji] = { data: b.data, diubah: b.diubah };

  return {
    profil: p
      ? { tg: p.tg, ujian: p.ujian, offset: p.offset_hari, lastAcc: p.last_acc, diubah: p.diubah }
      : null,
    ks,
    log: barisLog,
    setujuPada: p?.setuju_pada ?? null,
  };
}

/** Mengirim bagian yang versi lokalnya lebih baru. */
export async function dorong(userId: string, data: AppData, h: HasilGabung): Promise<void> {
  const sb = supabase;
  if (!sb) throw new Error("Server belum dikonfigurasi");

  // ---- kanji
  const barisKanji = h.dorongKs.map((k) => ({
    user_id: userId,
    kanji: k,
    data: data.ks[k],
    diubah: data.ks[k]?.diubah ?? new Date().toISOString(),
  }));
  for (let i = 0; i < barisKanji.length; i += SEKALI_KIRIM) {
    const { error } = await sb
      .from("kanji_state")
      .upsert(barisKanji.slice(i, i + SEKALI_KIRIM), { onConflict: "user_id,kanji" });
    if (error) throw new Error(error.message);
  }

  // ---- log sesi (tambah-saja; id yang sudah ada dibiarkan)
  const barisLog = h.dorongLog
    .filter((e) => e.id)
    .map((e) => ({ id: e.id!, user_id: userId, d: e.d, n: e.n, acc: e.acc }));
  for (let i = 0; i < barisLog.length; i += SEKALI_KIRIM) {
    const { error } = await sb
      .from("log_sesi")
      .upsert(barisLog.slice(i, i + SEKALI_KIRIM), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // ---- meta
  if (h.dorongMeta) {
    const { error } = await sb.from("profil").upsert(
      {
        id: userId,
        tg: data.tg,
        ujian: data.ujian,
        offset_hari: data.offset,
        last_acc: data.lastAcc,
        diubah: data.metaDiubah ?? new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
  }
}

/** Mencatat persetujuan murid di server. */
export async function catatSetuju(userId: string): Promise<void> {
  const sb = supabase;
  if (!sb) return;
  const { error } = await sb
    .from("profil")
    .upsert({ id: userId, setuju_pada: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/** Menghapus akun beserta seluruh datanya di server. */
export async function hapusAkun(): Promise<void> {
  const sb = supabase;
  if (!sb) throw new Error("Server belum dikonfigurasi");
  const { error } = await sb.rpc("hapus_akun_saya");
  if (error) throw new Error(error.message);
}
