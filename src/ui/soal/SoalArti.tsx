import { useState } from "react";
import { SEMUA_KATA } from "../../data/katalog";
import { sample, shuffle } from "../../engine/acak";
import type { Kosakata } from "../../types";
import { Jp } from "../komponen";
import { Pilihan } from "./Pilihan";

export function SoalArti({ kata, v, hasil, onJawab }: { kata: string; v: Kosakata; hasil: boolean | null; onJawab: (ok: boolean) => void }) {
  const [opsi] = useState(() => {
    const lain = [...new Set(SEMUA_KATA.map((x) => x.v.arti))].filter((m) => m !== v.arti);
    return shuffle([v.arti, ...sample(lain, 3)]);
  });
  return (
    <div>
      <p className="text-sm text-redup">Apa arti kosakata ini?</p>
      <Jp as="p" className="text-6xl text-center mt-6">{kata}</Jp>
      <p className="text-center mt-2 text-redup">{v.romaji}</p>
      <Pilihan opsi={opsi} benar={v.arti} hasil={hasil} onPilih={onJawab} tampil={(o) => o} />
    </div>
  );
}
