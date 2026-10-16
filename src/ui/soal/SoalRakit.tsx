import { useState } from "react";
import { KMAP, KSET, SEMUA_KANJI } from "../../data/katalog";
import { sample, shuffle } from "../../engine/acak";
import type { AppData, Kosakata } from "../../types";
import { Jp } from "../komponen";

/**
 * Rakit kosakata. Kotak kosong = kanji target + kanji lain yang sudah pernah
 * dijawab benar; sisanya tampil sebagai teks. Kata dengan bacaan khusus
 * (seg_valid: false) tidak pernah sampai ke sini; lihat `kosakataUntuk`.
 */
export function SoalRakit({ target, v, data, hasil, onJawab }: {
  target: string; v: Kosakata; data: AppData; hasil: boolean | null; onJawab: (ok: boolean) => void;
}) {
  const [blanks] = useState(() =>
    v.seg
      .map((seg, i) => ({ seg, i }))
      .filter(({ seg }) => KSET.has(seg[0]) && (seg[0] === target || data.ks[seg[0]]?.everCorrect))
      .map(({ i }) => i),
  );
  const [terisi, setTerisi] = useState<Record<number, string>>({});
  const [slotSalah, setSlotSalah] = useState<number[]>([]);
  // kanji yang dipilih murid di kotak yang salah, ditampilkan di bawah kotak itu
  const [pilihanSalah, setPilihanSalah] = useState<Record<number, string>>({});
  const cur = blanks.find((i) => !(i in terisi));

  const [opsiSlot] = useState(() => {
    const o: Record<number, string[]> = {};
    for (const i of blanks) {
      const k = v.seg[i]![0];
      const kanji = KMAP[k]!;
      const tambahan = sample(SEMUA_KANJI.filter((x) => x !== k && !kanji.distraktor.includes(x)), 2);
      o[i] = shuffle([k, ...kanji.distraktor, ...tambahan]);
    }
    return o;
  });

  const pilih = (ch: string) => {
    if (hasil !== null || cur === undefined) return;
    const ok = ch === v.seg[cur]![0];
    const baru = { ...terisi, [cur]: v.seg[cur]![0] };
    const salah = ok ? slotSalah : [...slotSalah, cur];
    setTerisi(baru);
    setSlotSalah(salah);
    if (!ok) setPilihanSalah((p) => ({ ...p, [cur]: ch }));
    if (blanks.every((i) => i in baru)) onJawab(salah.length === 0);
  };

  // kata panjang: kotak diperkecil supaya muat di layar 320 px
  const ukuran = v.seg.length <= 3 ? 76 : v.seg.length === 4 ? 64 : 52;

  return (
    <div>
      <p className="text-sm text-redup">Rakit kosakata</p>
      <p className="text-3xl font-bold text-center mt-4">{v.arti}</p>
      <div className="flex justify-center items-end flex-wrap gap-1 mt-6">
        {v.seg.map((seg, i) => {
          const kosong = blanks.includes(i);
          const kanji = seg[1] !== "";
          return (
            <div key={i} className="flex flex-col items-center">
              {kosong ? (
                <Jp
                  as="div"
                  className={`flex items-center justify-center rounded-xl border-2 ${
                    i === cur ? "border-solid border-aksen" : "border-dashed border-garis"
                  } ${i in terisi ? "bg-white" : "bg-kotak"} ${slotSalah.includes(i) ? "text-merah" : "text-tinta"}`}
                  style={{ width: ukuran, height: ukuran, fontSize: ukuran * 0.66 }}
                >
                  {terisi[i] || ""}
                </Jp>
              ) : (
                <Jp as="div" className="flex items-end justify-center"
                  style={{ height: ukuran, minWidth: kanji ? ukuran : ukuran / 2, fontSize: ukuran * 0.66 }}>
                  {seg[0]}
                </Jp>
              )}
              <Jp className="text-sm mt-1 text-redup min-h-5">{seg[1]}</Jp>
              {pilihanSalah[i] && (
                <span className="flex flex-col items-center leading-tight text-merah" aria-label={`Pilihanmu: ${pilihanSalah[i]}`}>
                  <span className="text-[11px]">Pilihanmu:</span>
                  <Jp className="text-xl line-through">{pilihanSalah[i]}</Jp>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-redup">{v.romaji}</p>

      {cur !== undefined && hasil === null && (
        <div className="grid grid-cols-3 gap-2 mt-6">
          {opsiSlot[cur]!.map((ch) => (
            <button key={ch} type="button" onClick={() => pilih(ch)} className="min-h-16 py-3 rounded-xl bg-white border border-garis">
              <Jp className="text-4xl">{ch}</Jp>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
