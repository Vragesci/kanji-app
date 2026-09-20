import { useEffect, useState } from "react";

// Pemasangan ke layar utama. Android/Chrome menawarkan pemasangan lewat event
// `beforeinstallprompt`; iPhone/iPad tidak punya event itu, jadi murid perlu petunjuk manual.

interface EventPasang extends Event {
  prompt(): Promise<void>;
}

let tertunda: EventPasang | null = null;
const pendengar = new Set<() => void>();
const kabari = () => pendengar.forEach((f) => f());

// dipasang saat modul dimuat, karena event bisa terjadi sebelum beranda tampil
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // pakai tombol kita sendiri, bukan bilah bawaan browser
    tertunda = e as EventPasang;
    kabari();
  });
  window.addEventListener("appinstalled", () => {
    tertunda = null;
    kabari();
  });
}

export type Platform = "ios" | "android" | "lain";

/** iPadOS 13+ mengaku sebagai Mac, tapi punya layar sentuh */
export function deteksiPlatform(ua: string, platform: string, titikSentuh: number): Platform {
  if (/iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && titikSentuh > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "lain";
}

export const platformSaatIni = (): Platform =>
  deteksiPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints || 0);

/** true bila dibuka dari ikon layar utama (bukan dari tab browser) */
export const sudahTerpasang = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function usePasang() {
  const [, paksa] = useState(0);
  useEffect(() => {
    const f = () => paksa((n) => n + 1);
    pendengar.add(f);
    return () => { pendengar.delete(f); };
  }, []);
  return {
    bisaLangsung: tertunda !== null,
    pasang: async () => {
      const e = tertunda;
      if (!e) return;
      tertunda = null; // event hanya bisa dipakai sekali
      kabari();
      await e.prompt();
    },
  };
}
