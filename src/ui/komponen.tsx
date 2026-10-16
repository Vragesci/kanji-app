import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { greenStrength, statusOf, type Status } from "../engine/fsrs";
import type { KanjiState } from "../types";

/** Teks Jepang: selalu lang="ja" dan font Jepang. */
export function Jp({ as: Tag = "span", className = "", ...rest }: { as?: "span" | "p" | "div" } & HTMLAttributes<HTMLElement>) {
  return <Tag lang="ja" className={`font-jp ${className}`} {...rest} />;
}

export function Btn({
  kind = "primary", className = "", ...rest
}: { kind?: "primary" | "ghost"; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const gaya = kind === "primary"
    ? "bg-aksen text-white"
    : "bg-white text-tinta border border-garis";
  return (
    <button type="button" className={`w-full min-h-12 py-3 px-4 rounded-xl text-base font-medium disabled:opacity-40 ${gaya} ${className}`} {...rest} />
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
    white: "bg-white text-tinta border border-garis",
    red: "bg-merah text-white border border-merah",
    orange: "bg-oranye text-white border border-oranye",
    green: "bg-hijau text-white border border-hijau",
  };
  const opacity = st === "green" ? 0.35 + Math.max(0.35, greenStrength(s!, t)) * 0.65 : undefined;
  // Untuk murid buta warna: semakin hafal, semakin besar hurufnya (merah kecil, oranye sedang, hijau besar).
  const hurufPeta: Record<Status, string> = {
    white: "text-xl", red: "text-sm", orange: "text-xl", green: "text-3xl font-bold",
  };
  // Titik kemajuan di peta: berapa kali benar dari 5 sebelum sesi menulis (oranye saja).
  const benar = st === "orange" && !ukuran ? Math.min(s?.count || 0, 5) : null;
  const label = `${k}, ${NAMA_STATUS[st]}${benar !== null ? `, benar ${benar} dari 5` : ""}`;
  return (
    <Jp as="div" role="img" aria-label={label}
      className={`relative flex items-center justify-center rounded-lg ${gaya[st]} ${ukuran ? "" : `w-full aspect-square ${hurufPeta[st]}`}`}
      style={ukuran ? { width: ukuran, height: ukuran, fontSize: ukuran * 0.55, opacity } : { opacity }}>
      {k}
      {benar !== null && (
        <span aria-hidden className="absolute bottom-1 inset-x-0 flex justify-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={`block size-1.5 rounded-full ${i < benar ? "bg-white" : "bg-white/35"}`} />
          ))}
        </span>
      )}
    </Jp>
  );
}
