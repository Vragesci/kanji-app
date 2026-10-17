import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { KAMUS, KMAP, labelTingkat } from "../data/katalog";
import { bacaanKanji, contohKata, type Bacaan } from "../data/bacaan";
import { statusOf } from "../engine/fsrs";
import type { AppData } from "../types";
import { Jp, NAMA_STATUS } from "./komponen";

const WARNA_STATUS = { white: "text-redup", red: "text-merah", orange: "text-oranye", green: "text-hijau" } as const;

/**
 * Detail kanji (2026-10-17), dibuka dengan mengetuk kotak di peta beranda: on-yomi, kun-yomi,
 * dan contoh kosakata sesuai tingkat yang dipilih di menu atas.
 */
export function DetailKanji({ k, data, onTutup }: { k: string; data: AppData; onTutup: () => void }) {
  const tutup = useRef<HTMLButtonElement>(null);
  useEffect(() => { tutup.current?.focus(); }, [k]);
  const [semua, setSemua] = useState(false);

  const info = KMAP[k]!;
  const tg = data.tg || "N5";
  const { on, kun } = useMemo(() => bacaanKanji(k), [k]);
  const contoh = useMemo(() => contohKata(k, tg), [k, tg]);
  const s = data.ks[k];
  const st = statusOf(s);
  const lain = on.some((b) => !b.dipakai) || kun.some((b) => !b.dipakai);
  const tampilkan = (xs: Bacaan[]) => (semua ? xs : xs.filter((b) => b.dipakai).length ? xs.filter((b) => b.dipakai) : xs.slice(0, 3));

  const tombolKeyboard = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" onKeyDown={tombolKeyboard}>
      <button type="button" aria-label="Tutup detail kanji" tabIndex={-1} onClick={onTutup} className="absolute inset-0 bg-tinta/40" />
      <div role="dialog" aria-modal="true" aria-label={`Detail kanji ${k}`}
        className="relative w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-latar shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 pt-3 pb-2 bg-latar">
          <span aria-hidden className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-10 rounded-full bg-garis" />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-garis mt-2">{labelTingkat(info.tingkat)}</span>
          <button ref={tutup} type="button" onClick={onTutup} aria-label="Tutup"
            className="size-11 rounded-full bg-white border border-garis text-xl mt-2">×</button>
        </div>

        <div className="px-5 space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-garis">
            <Jp as="div" className="text-7xl leading-none font-bold w-24 h-24 flex items-center justify-center rounded-xl bg-kotak shrink-0">{k}</Jp>
            <div className="min-w-0">
              <p className={`font-bold ${WARNA_STATUS[st]}`}>{NAMA_STATUS[st][0]!.toUpperCase() + NAMA_STATUS[st].slice(1)}</p>
              {st === "orange" && (
                <p className="text-sm mt-1 text-redup">Benar {Math.min(s?.count || 0, 5)} dari 5{s?.readyWrite ? " · siap latihan tulis" : ""}</p>
              )}
              {info.level && (
                <p className="text-sm mt-1 text-redup">
                  Irodori <Jp>{info.level}</Jp> ({{ 入門: "Nyuumon", 初級1: "Shokyuu 1", 初級2: "Shokyuu 2" }[info.level] ?? info.level})
                  {info.bab ? `, bab ${info.bab}` : ""}
                </p>
              )}
            </div>
          </div>

          <BarisBacaan judul="On-yomi" sub="bacaan Tionghoa, biasanya di kata gabungan" isi={tampilkan(on)} />
          <BarisBacaan judul="Kun-yomi" sub="bacaan Jepang, biasanya kata sendiri" isi={tampilkan(kun)} />
          {lain && (
            <button type="button" onClick={() => setSemua(!semua)} className="text-sm underline text-redup min-h-11 -mt-2">
              {semua ? "Tampilkan bacaan yang sering dipakai saja" : "Tampilkan semua bacaan"}
            </button>
          )}

          <section>
            <h3 className="text-sm font-bold">Contoh kata <span className="font-normal text-redup">· sampai {labelTingkat(tg)}</span></h3>
            {contoh.diAtas && (
              <p className="text-xs mt-1 text-redup">Belum ada kata setingkat {labelTingkat(tg)}. Ini kata termudah yang tersedia.</p>
            )}
            {contoh.kata.length === 0 ? (
              <p className="text-sm mt-2 text-redup">Belum ada contoh kata untuk kanji ini.</p>
            ) : (
              <ul className="mt-2 rounded-2xl bg-white border border-garis divide-y divide-garis">
                {contoh.kata.map((w) => {
                  const v = KAMUS[w]!;
                  return (
                    <li key={w} className="flex items-center gap-3 px-4 py-3">
                      <Jp className="text-xl font-bold min-w-20">{w}</Jp>
                      <div className="min-w-0">
                        <p className="text-sm"><Jp>{v.kana}</Jp> <span className="text-redup">({v.romaji})</span></p>
                        <p className="text-sm font-medium">{v.arti}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function BarisBacaan({ judul, sub, isi }: { judul: string; sub: string; isi: Bacaan[] }) {
  return (
    <section>
      <h3 className="text-sm font-bold">{judul} <span className="font-normal text-redup">· {sub}</span></h3>
      {isi.length === 0 ? (
        <p className="text-sm mt-2 text-redup">Tidak ada.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          {isi.map((b) => (
            <span key={b.tampil} className={`px-3 py-2 rounded-xl border ${b.dipakai ? "bg-white border-garis" : "bg-kotak border-transparent"}`}>
              <Jp className="text-lg font-bold">{b.akar}</Jp>
              {b.okuri && <Jp className="text-lg text-redup">{b.okuri}</Jp>}
              <span className="text-sm text-redup ml-1.5">{b.romaji}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
