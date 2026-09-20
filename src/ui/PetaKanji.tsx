import { useMemo } from "react";
import { aktif } from "../engine/sesi";
import { statusOf } from "../engine/fsrs";
import type { AppData, Kanji } from "../types";
import { Jp, KotakKanji } from "./komponen";

// Kelompok mengikuti level buku IRODORI; kanji tanpa level dikelompokkan menurut tingkatnya.
// Urutan di dalam kelompok = urutan kanji baru diperkenalkan.
const KELOMPOK: { kunci: string; judul: string; romaji?: string }[] = [
  { kunci: "N5", judul: "N5" },
  { kunci: "入門", judul: "入門", romaji: "Nyuumon" },
  { kunci: "初級1", judul: "初級1", romaji: "Shokyuu 1" },
  { kunci: "初級2", judul: "初級2", romaji: "Shokyuu 2" },
  { kunci: "N3", judul: "N3" },
  { kunci: "N2", judul: "N2" },
  { kunci: "N1", judul: "N1" },
];

const LEGENDA = [
  { kelas: "bg-white border border-garis", teks: "Belum dilihat" },
  { kelas: "bg-merah", teks: "Belum hafal" },
  { kelas: "bg-oranye", teks: "Sedang proses" },
  { kelas: "bg-hijau", teks: "Hafal (pudar = perlu diulang)" },
];

/** Membagi kanji ke kelompok peta; kanji yang tidak cocok dengan kelompok mana pun akan hilang dari peta. */
export function kelompokkan(kanji: Kanji[]) {
  return KELOMPOK.map((g) => ({ ...g, isi: kanji.filter((x) => (x.level ?? x.tingkat) === g.kunci) })).filter((g) => g.isi.length);
}

/** Peta kotak berwarna: satu kotak per kanji aktif. */
export function PetaKanji({ data, t }: { data: AppData; t: string }) {
  const grup = useMemo(() => kelompokkan(aktif(data)), [data.tg]);

  return (
    <section aria-label="Peta kanji">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-redup">
        {LEGENDA.map((l) => (
          <span key={l.teks} className="flex items-center gap-1">
            <i className={`inline-block size-3 rounded ${l.kelas}`} />{l.teks}
          </span>
        ))}
      </div>
      {grup.map((g) => {
        const hafal = g.isi.filter((x) => statusOf(data.ks[x.kanji]) === "green").length;
        return (
          <div key={g.kunci} className="mt-5">
            <p className="text-xs mb-2 text-redup">
              <Jp>{g.judul}</Jp>{g.romaji && ` (${g.romaji})`} — {hafal}/{g.isi.length} hafal
            </p>
            <div className="grid grid-cols-6 gap-2">
              {g.isi.map((x) => <KotakKanji key={x.kanji} k={x.kanji} s={data.ks[x.kanji]} t={t} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}
