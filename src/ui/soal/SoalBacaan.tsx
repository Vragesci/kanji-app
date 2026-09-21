import { useState } from "react";
import { pengecohBacaan } from "../../data/pengecoh";
import { shuffle } from "../../engine/acak";
import type { Kosakata } from "../../types";
import { Jp } from "../komponen";
import { Pilihan } from "./Pilihan";

export function SoalBacaan({ kata, v, hasil, onJawab }: { kata: string; v: Kosakata; hasil: boolean | null; onJawab: (ok: boolean) => void }) {
  // pengecoh: sebagian soal memakai bacaan yang mirip (dakuten, vokal panjang, っ, kanji mirip); sisanya kana acak sepanjang sama
  const [opsi] = useState(() => shuffle([v.kana, ...pengecohBacaan(kata, v)]));
  return (
    <div>
      <p className="text-sm text-redup">Pilih cara baca yang benar</p>
      <Jp as="p" className="text-6xl text-center mt-6">{kata}</Jp>
      <Pilihan
        opsi={opsi} benar={v.kana} hasil={hasil} onPilih={onJawab}
        tampil={(o) => <Jp className="block text-xl text-center">{o}</Jp>}
      />
    </div>
  );
}
