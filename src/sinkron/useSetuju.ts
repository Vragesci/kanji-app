import { useCallback, useEffect, useState } from "react";
import { catatSetuju } from "./sinkron";

export type Setuju = "belum" | "setuju" | "tolak";

// Disimpan per akun, di localStorage, supaya jawabannya diketahui bahkan saat
// tanpa sinyal (server belum tentu bisa ditanya saat aplikasi dibuka).
const kunci = (userId: string) => `kanji-app:setuju:${userId}`;

const baca = (userId: string): Setuju => {
  try {
    const v = localStorage.getItem(kunci(userId));
    return v === "setuju" || v === "tolak" ? v : "belum";
  } catch { return "belum"; }
};
const tulis = (userId: string, v: Setuju) => {
  try { localStorage.setItem(kunci(userId), v); } catch { /* abaikan */ }
};

/** Persetujuan murid untuk menyimpan data belajarnya di server. */
export function useSetuju(userId: string | null) {
  const [setuju, setSetuju] = useState<Setuju>(() => (userId ? baca(userId) : "belum"));
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => { setSetuju(userId ? baca(userId) : "belum"); }, [userId]);

  const terima = useCallback(async () => {
    if (!userId) return;
    setSibuk(true);
    // Dicatat lokal lebih dulu: kalau server tidak terjangkau, murid tidak
    // perlu menjawab pertanyaan yang sama lagi nanti.
    tulis(userId, "setuju");
    setSetuju("setuju");
    try { await catatSetuju(userId); } catch { /* dicoba lagi pada sinkronisasi berikutnya */ }
    setSibuk(false);
  }, [userId]);

  const tolak = useCallback(() => {
    if (!userId) return;
    tulis(userId, "tolak");
    setSetuju("tolak");
  }, [userId]);

  return { setuju, sibuk, terima, tolak };
}
