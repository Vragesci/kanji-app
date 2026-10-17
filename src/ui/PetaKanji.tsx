import { useMemo } from "react";
import { aktif } from "../engine/sesi";
import { statusOf, type Status } from "../engine/fsrs";
import type { AppData, Kanji, KanjiState } from "../types";
import { Jp, KotakKanji } from "./komponen";

// Kelompok mengikuti level buku IRODORI; kanji tanpa level dikelompokkan menurut tingkatnya.
// Urutan di dalam kelompok = urutan kanji baru diperkenalkan.
const KELOMPOK: { kunci: string; judul: string; romaji?: string; jp?: boolean }[] = [
  { kunci: "N5", judul: "N5" },
  { kunci: "入門", judul: "入門", romaji: "Nyuumon", jp: true },
  { kunci: "初級1", judul: "初級1", romaji: "Shokyuu 1", jp: true },
  { kunci: "初級2", judul: "初級2", romaji: "Shokyuu 2", jp: true },
  { kunci: "N3", judul: "N3" },
  { kunci: "N2", judul: "N2" },
  { kunci: "N1", judul: "N1" },
];

const LEGENDA = [
  { kelas: "bg-white border border-garis", teks: "Belum dilihat" },
  { kelas: "bg-merah", teks: "Belum hafal (huruf kecil)" },
  { kelas: "bg-oranye", teks: "Sedang proses (huruf sedang; titik = benar ke-berapa dari 5)" },
  { kelas: "bg-hijau", teks: "Hafal (huruf besar; pudar = perlu diulang)" },
];

// Urutan kanji yang sudah dipelajari di kelompok teratas: hijau dulu, lalu oranye, lalu merah.
const PRIORITAS: Record<Status, number> = { green: 0, orange: 1, red: 2, white: 3 };

/**
 * Membagi kanji ke kelompok peta; kanji yang tidak cocok dengan kelompok mana pun akan hilang dari peta.
 *
 * Kanji yang sudah dipelajari (merah/oranye/hijau) dipindah ke kelompok paling atas (2026-10-17):
 * kalau dibiarkan di kelompoknya, kemajuan murid tertutup ratusan kotak putih dan baru kelihatan
 * setelah menggulir jauh ke bawah. Kanji itu tidak digandakan — di kelompok asalnya ia hilang.
 */
export function kelompokkan(kanji: Kanji[], ks: Record<string, KanjiState> = {}) {
  const st = (x: Kanji) => statusOf(ks[x.kanji]);
  const dipelajari = kanji.filter((x) => st(x) !== "white")
    .sort((a, b) => PRIORITAS[st(a)] - PRIORITAS[st(b)]); // sort stabil: urutan katalog dipertahankan
  const belum = kanji.filter((x) => st(x) === "white");
  const grup = KELOMPOK.map((g) => ({ ...g, isi: belum.filter((x) => (x.level ?? x.tingkat) === g.kunci) })).filter((g) => g.isi.length);
  if (!dipelajari.length) return grup;
  return [{ kunci: "dipelajari", judul: "Sudah dipelajari", isi: dipelajari, romaji: undefined, jp: false }, ...grup];
}

/** Peta kotak berwarna: satu kotak per kanji aktif. */
export function PetaKanji({ data, t, pilihan, onPilih, onBuka }: {
  data: AppData; t: string;
  /** kanji yang sedang dipilih; kotak bisa diketuk untuk memilih kalau `onPilih` diberikan */
  pilihan?: string[]; onPilih?: (k: string) => void;
  /** di luar mode memilih: mengetuk kotak membuka detail kanji */
  onBuka?: (k: string) => void;
}) {
  const grup = useMemo(() => kelompokkan(aktif(data), data.ks), [data.tg, data.ks]);

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
        // Kelompok lain hanya berisi kanji putih (yang sudah dipelajari pindah ke atas),
        // jadi yang disebut di situ jumlah kanji yang belum dilihat, bukan "0/n hafal".
        const ringkas = g.kunci === "dipelajari" ? `${hafal}/${g.isi.length} hafal` : `${g.isi.length} belum dilihat`;
        return (
          <div key={g.kunci} className="mt-5">
            <p className="text-xs mb-2 text-redup">
              {g.jp ? <Jp>{g.judul}</Jp> : g.judul}{g.romaji && ` (${g.romaji})`} — {ringkas}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {g.isi.map((x) => {
                const kotak = <KotakKanji k={x.kanji} s={data.ks[x.kanji]} t={t} />;
                if (!onPilih) {
                  if (!onBuka) return <div key={x.kanji}>{kotak}</div>;
                  return (
                    <button key={x.kanji} type="button" aria-label={`Lihat detail ${x.kanji}`} onClick={() => onBuka(x.kanji)}
                      className="rounded-lg active:scale-95 transition-transform">
                      {kotak}
                    </button>
                  );
                }
                const dipilih = !!pilihan?.includes(x.kanji);
                // tanda pilihan berupa bingkai tebal + centang, bukan warna, supaya terlihat oleh murid buta warna
                return (
                  <button key={x.kanji} type="button" aria-pressed={dipilih} aria-label={`Pilih ${x.kanji}`} onClick={() => onPilih(x.kanji)}
                    className={`relative rounded-lg ${dipilih ? "outline-4 outline-offset-1 outline-aksen" : ""}`}>
                    {kotak}
                    {dipilih && <span aria-hidden className="absolute -top-1 -right-1 size-5 rounded-full bg-aksen text-white text-xs flex items-center justify-center">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
