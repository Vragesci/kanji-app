import { useState } from "react";
import { kapital, pengecohArti } from "../../data/pengecoh";
import { shuffle } from "../../engine/acak";
import type { Kosakata } from "../../types";
import { Jp } from "../komponen";
import { Pilihan } from "./Pilihan";

export function SoalArti({ kata, v, hasil, onJawab }: { kata: string; v: Kosakata; hasil: boolean | null; onJawab: (ok: boolean) => void }) {
  // pengecoh satu lingkup makna dengan kata soal (mis. arah: 南 → utara, timur, barat)
  const [opsi] = useState(() => shuffle([v.arti, ...pengecohArti(kata, v)]));
  // romaji sengaja tidak tampil di bawah kata soal; baru tampil di kartu setelah murid menjawab
  return (
    <div>
      <p className="text-sm text-redup">Apa arti kosakata ini?</p>
      <Jp as="p" className="text-6xl text-center mt-6">{kata}</Jp>
      <Pilihan opsi={opsi} benar={v.arti} hasil={hasil} onPilih={onJawab} tampil={kapital} />
    </div>
  );
}
