import type { Kosakata } from "../../types";
import { Jp } from "../komponen";

export function KartuKata({ kata, v, ringkas }: { kata: string; v: Kosakata; ringkas?: boolean }) {
  return (
    <div className={`rounded-xl bg-white text-center border border-garis ${ringkas ? "mt-2 p-3" : "mt-6 p-5"}`}>
      <Jp as="p" className={ringkas ? "text-3xl" : "text-5xl"}>{kata}</Jp>
      <Jp as="p" className="text-lg mt-1 text-aksen">{v.kana}</Jp>
      <p className="text-sm text-redup">{v.romaji}</p>
      <p className="mt-2 font-medium">{v.arti}</p>
    </div>
  );
}
