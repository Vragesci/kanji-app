import type { Kosakata } from "../../types";
import { kapital } from "../../data/pengecoh";
import { Jp, TombolUcap } from "../komponen";

export function KartuKata({ kata, v, ringkas }: { kata: string; v: Kosakata; ringkas?: boolean }) {
  return (
    <div className={`rounded-xl bg-kartu text-center border border-garis ${ringkas ? "mt-2 p-3" : "mt-6 p-5"}`}>
      <Jp as="p" className={ringkas ? "text-3xl" : "text-5xl"}>{kata}</Jp>
      <div className="flex items-center justify-center gap-3 mt-1">
        <Jp as="p" className="text-lg text-aksen">{v.kana}</Jp>
        <TombolUcap kana={v.kana} />
      </div>
      <p className="text-sm text-redup">{v.romaji}</p>
      <p className="mt-2 font-medium">{kapital(v.arti)}</p>
    </div>
  );
}
