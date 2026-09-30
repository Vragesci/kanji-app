import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "../types";
import { gabung, type HasilGabung } from "./gabung";
import { masalahJaringan, supabase } from "./klien";
import { dorong, tarik } from "./sinkron";

export type StatusSinkron = "mati" | "sedang" | "beres" | "luring" | "gagal";

/** Jeda setelah murid menjawab sebelum perubahan dikirim, supaya satu sesi tidak jadi 10 permintaan. */
const JEDA_KIRIM = 4000;

export function useSinkron(opts: {
  userId: string | null;
  /** sinkronisasi hanya jalan setelah murid menyetujui datanya disimpan di server */
  setuju: boolean;
  data: AppData | null;
  ganti: (fn: (d: AppData) => AppData) => void;
}) {
  const { userId, setuju, data, ganti } = opts;
  const [status, setStatus] = useState<StatusSinkron>("mati");
  const [pesan, setPesan] = useState<string | null>(null);

  const jalan = useRef(false);
  const lagi = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  // Simpan callback terbaru di ref supaya `jalankan` tidak perlu dibuat ulang
  // setiap render — kalau dibuat ulang, effect pemicunya ikut jalan berulang.
  const gantiRef = useRef(ganti);
  gantiRef.current = ganti;

  const aktif = Boolean(userId && setuju && supabase);

  const jalankan = useCallback(async () => {
    if (!userId || !setuju || !supabase) return;
    if (jalan.current) { lagi.current = true; return; }
    jalan.current = true;
    setStatus("sedang");
    try {
      const server = await tarik(userId);

      // Penting: penggabungan dihitung terhadap keadaan lokal TERKINI, bukan
      // terhadap salinan sebelum permintaan dikirim. Kalau tidak, jawaban yang
      // masuk selagi permintaan berjalan akan tertimpa hasil gabungan.
      const wadah: { h: HasilGabung | null } = { h: null };
      gantiRef.current((sekarang) => {
        const h = gabung(sekarang, server);
        wadah.h = h;
        return h.data;
      });

      if (wadah.h) await dorong(userId, wadah.h.data, wadah.h);
      setStatus("beres");
      setPesan(null);
    } catch (e) {
      if (masalahJaringan(e)) {
        setStatus("luring");
        setPesan(null);
      } else {
        setStatus("gagal");
        setPesan(e instanceof Error ? e.message : "Sinkronisasi gagal.");
      }
    } finally {
      jalan.current = false;
      if (lagi.current) { lagi.current = false; void jalankan(); }
    }
  }, [userId, setuju]);

  // Sinkronisasi pertama, lalu setiap kali sinyal kembali, aplikasi dilihat lagi,
  // atau aplikasi disembunyikan (yang terakhir supaya sisa perubahan terkirim
  // tanpa menunggu jeda, mis. saat murid menutup aplikasi selesai satu sesi).
  useEffect(() => {
    if (!aktif) { setStatus("mati"); return; }
    void jalankan();
    const saatDaring = () => void jalankan();
    const saatBerubah = () => void jalankan();
    window.addEventListener("online", saatDaring);
    document.addEventListener("visibilitychange", saatBerubah);
    return () => {
      window.removeEventListener("online", saatDaring);
      document.removeEventListener("visibilitychange", saatBerubah);
    };
  }, [aktif, jalankan]);

  // Perubahan dari murid: kirim setelah jeda singkat.
  useEffect(() => {
    if (!aktif || !data) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void jalankan(), JEDA_KIRIM);
    return () => window.clearTimeout(timer.current);
  }, [aktif, data, jalankan]);

  return { status, pesan, sinkronkanSekarang: jalankan };
}
