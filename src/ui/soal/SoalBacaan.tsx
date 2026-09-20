import { useState } from "react";
import { SEMUA_KATA } from "../../data/katalog";
import { sample, shuffle } from "../../engine/acak";
import type { Kosakata } from "../../types";
import { Jp } from "../komponen";
import { Pilihan } from "./Pilihan";

export function SoalBacaan({ kata, v, hasil, onJawab }: { kata: string; v: Kosakata; hasil: boolean | null; onJawab: (ok: boolean) => void }) {
  const [opsi] = useState(() => {
    // pengecoh: bacaan lain yang panjangnya sama dulu; tidak boleh ada dua opsi dengan kana yang sama
    const pool = SEMUA_KATA.filter((x) => x.v.kana !== v.kana).map((x) => x.v);
    const unik = [...new Map(pool.map((x) => [x.kana, x])).values()];
    const sama = unik.filter((x) => x.kana.length === v.kana.length);
    const picks = sample(sama, 3);
    const sisa = sample(unik.filter((x) => !picks.includes(x)), 3 - picks.length);
    return shuffle([v, ...picks, ...sisa]);
  });
  return (
    <div>
      <p className="text-sm text-redup">Pilih cara baca yang benar</p>
      <Jp as="p" className="text-6xl text-center mt-6">{kata}</Jp>
      <p className="text-center mt-2 text-redup">{v.arti}</p>
      <Pilihan
        opsi={opsi} benar={v} hasil={hasil} onPilih={onJawab}
        tampil={(o) => (
          <span className="flex flex-wrap justify-between items-baseline gap-x-3">
            <Jp className="text-xl">{o.kana}</Jp>
            <span className="text-sm text-redup">{o.romaji}</span>
          </span>
        )}
      />
    </div>
  );
}
