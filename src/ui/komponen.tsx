import { useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { adaSuaraJepang, ucapkan } from "../suara";
import { greenStrength, statusOf, type Status } from "../engine/fsrs";
import type { KanjiState } from "../types";

/**
 * Nama aplikasi "Nga字 Kanji" (logo L3): huruf Reggae One, 字 memakai huruf Jepang baku berwarna biru logo.
 * Pembaca layar tetap membaca "Ngaji Kanji".
 */
export function NamaAplikasi({ as: Tag = "h1", className = "" }: { as?: "h1" | "h2"; className?: string }) {
  return (
    <Tag aria-label="Ngaji Kanji" className={`font-merek leading-tight text-tinta ${className}`}>
      <span aria-hidden="true">
        Nga<span lang="ja" className="font-jp font-bold text-merek">字</span> Kanji
      </span>
    </Tag>
  );
}

/** Teks Jepang: selalu lang="ja" dan font Jepang. */
export function Jp({ as: Tag = "span", className = "", ...rest }: { as?: "span" | "p" | "div" } & HTMLAttributes<HTMLElement>) {
  return <Tag lang="ja" className={`font-jp ${className}`} {...rest} />;
}

export function Btn({
  kind = "primary", className = "", ...rest
}: { kind?: "primary" | "ghost"; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const gaya = kind === "primary"
    ? "bg-aksen text-latar font-extrabold shadow-[0_5px_0_#B98A14] active:translate-y-[3px] active:shadow-[0_2px_0_#B98A14] disabled:shadow-none mb-1.5"
    : "bg-kartu text-tinta border-2 border-garis";
  return (
    <button type="button" className={`w-full min-h-13 py-3 px-4 rounded-2xl text-base font-bold disabled:opacity-40 ${gaya} ${className}`} {...rest} />
  );
}

export const NAMA_STATUS: Record<Status, string> = {
  white: "belum dilihat",
  red: "belum hafal",
  orange: "sedang proses",
  green: "hafal",
};

/**
 * Kotak kanji berwarna: putih / merah / oranye / hijau (pudar = retrievability FSRS).
 * Tanpa `ukuran`, kotak mengisi lebar selnya (untuk peta); status juga dibacakan lewat aria-label.
 */
export function KotakKanji({ k, s, t, ukuran }: { k: string; s: KanjiState | undefined; t: string; ukuran?: number }) {
  const st = statusOf(s);
  const gaya: Record<Status, string> = {
    white: "bg-kartu text-tinta border border-garis",
    red: "bg-merah text-latar border border-merah",
    orange: "bg-oranye text-latar border border-oranye",
    green: "bg-hijau text-latar border border-hijau",
  };
  const opacity = st === "green" ? 0.35 + Math.max(0.35, greenStrength(s!, t)) * 0.65 : undefined;
  // Untuk murid buta warna: semakin hafal, semakin besar hurufnya (merah kecil, oranye sedang, hijau besar).
  const hurufPeta: Record<Status, string> = {
    white: "text-xl", red: "text-sm", orange: "text-xl", green: "text-3xl font-bold",
  };
  // Titik kemajuan di peta (2026-11-02): titik pertama = kanji sudah dikenalkan, lima sisanya
  // = berapa kali benar dari 5 sebelum sesi menulis. Titik "dikenalkan" sengaja sudah terisi
  // sejak kanji pertama kali muncul, jadi kemajuan terlihat sejak langkah pertama dan bukan
  // lima titik kosong. Berlaku untuk merah dan oranye; hijau tidak perlu titik.
  const benar = (st === "red" || st === "orange") && !ukuran ? Math.min(s?.count || 0, 5) : null;
  const label = `${k}, ${NAMA_STATUS[st]}${benar !== null ? `, sudah dikenalkan, benar ${benar} dari 5` : ""}`;
  return (
    <Jp as="div" role="img" aria-label={label}
      className={`relative flex items-center justify-center rounded-lg ${gaya[st]} ${ukuran ? "" : `w-full aspect-square ${hurufPeta[st]}`}`}
      style={ukuran ? { width: ukuran, height: ukuran, fontSize: ukuran * 0.55, opacity } : { opacity }}>
      {k}
      {benar !== null && (
        <span aria-hidden className="absolute bottom-1 inset-x-0 flex justify-center gap-0.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} className={`block size-1 rounded-full ${i <= benar ? "bg-latar" : "bg-latar/35"}`} />
          ))}
        </span>
      )}
    </Jp>
  );
}

/**
 * Tombol pengeras suara untuk satu kosakata (2026-11-13). Tidak tampil kalau perangkat
 * tidak punya suara bahasa Jepang, supaya murid tidak menekan tombol yang diam.
 */
export function TombolUcap({ kana, className = "" }: { kana: string; className?: string }) {
  const [ada, setAda] = useState(adaSuaraJepang);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const cek = () => setAda(adaSuaraJepang());
    window.speechSynthesis.addEventListener?.("voiceschanged", cek);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", cek);
  }, []);
  if (ada === false) return null;
  return (
    <button type="button" onClick={() => ucapkan(kana, { paksa: true })} aria-label="Dengarkan pengucapan"
      className={`size-11 shrink-0 rounded-full bg-merek text-latar flex items-center justify-center shadow-[0_3px_0_#3346C2] active:translate-y-[2px] active:shadow-[0_1px_0_#3346C2] ${className}`}>
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </button>
  );
}
