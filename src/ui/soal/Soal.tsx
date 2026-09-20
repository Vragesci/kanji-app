import { useState } from "react";
import { KAMUS, kosakataUntuk } from "../../data/katalog";
import type { AppData, ItemSoal } from "../../types";
import { Btn } from "../komponen";
import { KartuKata } from "./KartuKata";
import { SoalArti } from "./SoalArti";
import { SoalBacaan } from "./SoalBacaan";
import { SoalRakit } from "./SoalRakit";

/** Satu soal: memilih kosakata, menampilkan jenis soalnya, lalu umpan balik dan tombol lanjut. */
export function Soal({ item, data, onDijawab, onLanjut }: {
  item: ItemSoal;
  data: AppData;
  onDijawab: (benar: boolean) => void;
  onLanjut: () => void;
}) {
  // kosakata dan status kanji dikunci saat soal dibuka, supaya tidak berubah di tengah soal
  const [kata] = useState(() => kosakataUntuk(item.k, data.ks[item.k]?.vi || 0, item.type === "rakit"));
  const [snap] = useState(() => data);
  const v = KAMUS[kata]!;
  const [hasil, setHasil] = useState<boolean | null>(null);

  const jawab = (ok: boolean) => {
    if (hasil !== null) return;
    setHasil(ok);
    onDijawab(ok);
  };

  return (
    <div className="mt-6">
      {item.type === "meaning" && <SoalArti kata={kata} v={v} hasil={hasil} onJawab={jawab} />}
      {item.type === "reading" && <SoalBacaan kata={kata} v={v} hasil={hasil} onJawab={jawab} />}
      {item.type === "rakit" && <SoalRakit target={item.k} v={v} data={snap} hasil={hasil} onJawab={jawab} />}

      {hasil !== null && (
        <div className="mt-5" aria-live="polite">
          <p className={`font-bold ${hasil ? "text-hijau" : "text-merah"}`}>{hasil ? "Benar" : "Belum tepat"}</p>
          <KartuKata kata={kata} v={v} ringkas />
          <Btn className="mt-4" onClick={onLanjut}>Lanjut</Btn>
        </div>
      )}
    </div>
  );
}
