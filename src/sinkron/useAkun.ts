import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { masalahJaringan, supabase, supabaseSiap } from "./klien";

/**
 * - `memuat` : masih memeriksa
 * - `masuk`  : ada sesi hidup
 * - `luring` : pernah masuk di perangkat ini, tapi sesi tidak bisa dipastikan
 *              karena jaringan. Murid TETAP boleh belajar.
 * - `keluar` : belum punya akun di perangkat ini, atau server menolak sesinya
 */
export type StatusAkun = "memuat" | "masuk" | "luring" | "keluar";

export interface Akun {
  id: string;
  email: string;
}

// Penanda kecil di localStorage: bukti bahwa perangkat ini pernah berhasil masuk.
// Inilah yang membuat aplikasi tetap bisa dibuka tanpa sinyal.
const KUNCI = "kanji-app:akun";

const bacaTanda = (): Akun | null => {
  try {
    const t = localStorage.getItem(KUNCI);
    if (!t) return null;
    const o = JSON.parse(t) as Partial<Akun>;
    return o.id && o.email ? { id: o.id, email: o.email } : null;
  } catch { return null; }
};
const tulisTanda = (a: Akun) => { try { localStorage.setItem(KUNCI, JSON.stringify(a)); } catch { /* abaikan */ } };
const hapusTanda = () => { try { localStorage.removeItem(KUNCI); } catch { /* abaikan */ } };

const dariSesi = (s: Session): Akun => ({ id: s.user.id, email: s.user.email ?? "" });

/**
 * Akun murid, dengan satu aturan yang dipegang ketat:
 *
 * **Tidak ada sinyal tidak boleh berarti tidak bisa belajar.** Masuk diwajibkan
 * sekali saat daring; sesudah itu murid yang sudah pernah masuk selalu boleh
 * memakai aplikasi. Hanya keluar-akun yang disengaja, atau penolakan tegas dari
 * server yang benar-benar terhubung, yang mengembalikannya ke layar masuk.
 */
export function useAkun() {
  const [status, setStatus] = useState<StatusAkun>(supabaseSiap ? "memuat" : "keluar");
  const [akun, setAkun] = useState<Akun | null>(() => bacaTanda());

  useEffect(() => {
    if (!supabase) return;
    let batal = false;

    const terima = (s: Session) => {
      const a = dariSesi(s);
      tulisTanda(a);
      if (batal) return;
      setAkun(a);
      setStatus("masuk");
    };

    // Tanpa sesi hidup: bedakan "server menolak" dari "tidak ada sinyal".
    const tanpaSesi = async (e?: unknown) => {
      const tanda = bacaTanda();
      if (!tanda) { if (!batal) setStatus("keluar"); return; }
      if (e && masalahJaringan(e)) { if (!batal) setStatus("luring"); return; }
      try {
        const { data, error } = await supabase!.auth.refreshSession();
        if (batal) return;
        if (data.session) { terima(data.session); return; }
        if (error && masalahJaringan(error)) { setStatus("luring"); return; }
        // Server menjawab dan sesinya memang tidak sah lagi.
        hapusTanda();
        setAkun(null);
        setStatus("keluar");
      } catch (e2) {
        if (batal) return;
        setStatus(masalahJaringan(e2) ? "luring" : "keluar");
      }
    };

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (batal) return;
        if (data.session) { terima(data.session); return; }
        void tanpaSesi(error);
      })
      .catch((e) => { if (!batal) void tanpaSesi(e); });

    const { data: langganan } = supabase.auth.onAuthStateChange((peristiwa, sesi) => {
      if (batal) return;
      if (sesi) { terima(sesi); return; }
      if (peristiwa === "SIGNED_OUT") {
        hapusTanda();
        setAkun(null);
        setStatus("keluar");
      }
      // Kegagalan menyegarkan token TIDAK mengeluarkan murid: bisa jadi hanya sinyal.
    });

    return () => { batal = true; langganan.subscription.unsubscribe(); };
  }, []);

  /** Mengirim email berisi tautan sekaligus kode 6 angka. */
  const kirimKode = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return "Aplikasi ini dibangun tanpa kredensial server.";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (!error) return null;
    return masalahJaringan(error)
      ? "Tidak ada sambungan. Coba lagi setelah tersambung internet."
      : (error.message || "Gagal mengirim email.");
  }, []);

  /** Memasukkan kode 6 angka dari email. Jalur utama di aplikasi terpasang. */
  const verifikasiKode = useCallback(async (email: string, kode: string): Promise<string | null> => {
    if (!supabase) return "Aplikasi ini dibangun tanpa kredensial server.";
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: kode.replace(/\D/g, ""),
      type: "email",
    });
    if (!error) return null;
    return masalahJaringan(error)
      ? "Tidak ada sambungan. Coba lagi setelah tersambung internet."
      : "Kode salah atau sudah kedaluwarsa. Minta kode baru.";
  }, []);

  const keluarAkun = useCallback(async () => {
    // Bersihkan penanda lokal lebih dulu: kalau sedang tanpa sinyal, permintaan
    // ke server akan gagal, dan murid tetap harus bisa keluar.
    hapusTanda();
    setAkun(null);
    setStatus("keluar");
    try { await supabase?.auth.signOut(); }
    catch { try { await supabase?.auth.signOut({ scope: "local" }); } catch { /* sudah bersih di lokal */ } }
  }, []);

  return {
    status,
    akun,
    /** Sesi luring tetap boleh belajar; hanya `keluar` yang menampilkan layar masuk. */
    bolehBelajar: status === "masuk" || status === "luring",
    kirimKode,
    verifikasiKode,
    keluarAkun,
  };
}
