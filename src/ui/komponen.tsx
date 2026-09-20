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
  return (
    <Jp as="div" role="img" aria-label={`${k}, ${NAMA_STATUS[st]}`}
      className={`flex items-center justify-center rounded-lg ${gaya[st]} ${ukuran ? "" : "w-full aspect-square text-xl"}`}
      style={ukuran ? { width: ukuran, height: ukuran, fontSize: ukuran * 0.55, opacity } : { opacity }}>
      {k}
    </Jp>
  );
}
