import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Diisi saat build lewat env var (Cloudflare Pages: Settings -> Variables).
// Kunci anon memang boleh tampil di kode klien; yang menjaga data murid adalah
// RLS di Supabase, bukan kerahasiaan kunci ini.
const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KUNCI_SB = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** false = aplikasi dibangun tanpa kredensial; layar masuk menjelaskannya. */
export const supabaseSiap = Boolean(URL_SB && KUNCI_SB);

export const supabase: SupabaseClient | null = supabaseSiap
  ? createClient(URL_SB!, KUNCI_SB!, {
      auth: {
        // Sesi disimpan di localStorage (ukurannya kecil, tidak seperti data belajar)
        // supaya aplikasi bisa dibuka lagi tanpa sinyal.
        persistSession: true,
        autoRefreshToken: true,
        // menangani tautan dari email kalau murid membukanya di browser
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Gagal karena jaringan, bukan karena ditolak server.
 *
 * Bedanya menentukan: kalau server benar-benar menolak sesi, murid harus masuk
 * lagi; kalau cuma tidak ada sinyal, murid harus tetap boleh belajar luring.
 * Karena itu bila ragu, jawabannya true (anggap masalah jaringan).
 */
export function masalahJaringan(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const nama = (e as { name?: string } | null)?.name ?? "";
  const status = (e as { status?: number } | null)?.status;
  if (nama === "AuthRetryableFetchError" || nama === "TypeError" || nama === "AbortError") return true;
  // 0 / tanpa status = permintaan tidak pernah sampai; 5xx = server ada masalah, bukan sesinya.
  if (status === undefined || status === 0 || status >= 500) return true;
  return false;
}
