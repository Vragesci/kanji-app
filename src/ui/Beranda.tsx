import { useMemo, useRef, useState } from "react";
import { TINGKAT, labelTingkat } from "../data/katalog";
import { statusOf } from "../engine/fsrs";
import { buildSession, aktif } from "../engine/sesi";
import { TOTAL_SOAL, tingkatBawah } from "../engine/penempatan";
import { parse } from "../engine/tanggal";
import type { AppData, ModeSesi } from "../types";
import { Btn } from "./komponen";
import { PetaKanji } from "./PetaKanji";
import { BannerPasang } from "./PetunjukPasang";

function Chip({ aktifnya, onClick, children }: { aktifnya: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktifnya}
      className={`px-3 min-h-11 rounded-full text-xs border ${aktifnya ? "border-aksen bg-aksen text-white" : "border-garis bg-white text-redup"}`}>
      {children}
    </button>
  );
}

/** Beranda: pengaturan dasar, tombol mulai, dan peta kanji. Tombol mulai di atas peta karena petanya panjang (hingga 1.377 kotak). */
export function Beranda({ data, t, ubah, onMulai, onTentang }: {
  data: AppData; t: string; ubah: (fn: (d: AppData) => AppData) => void; onMulai: (m: ModeSesi, pilihan?: string[]) => void; onTentang: () => void;
}) {
  const [memilih, setMemilih] = useState(false);
  const [pilihan, setPilihan] = useState<string[]>([]);
  const petaRef = useRef<HTMLDivElement>(null);
  const MAKS = 10; // satu sesi = 10 soal
  const togel = (k: string) =>
    setPilihan((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= MAKS ? p : [...p, k]));
  const mulaiMemilih = () => {
    setMemilih(true);
    petaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selesaiMemilih = () => { setMemilih(false); setPilihan([]); };
  const set = useMemo(() => aktif(data), [data.tg]);
  const hafal = set.filter((x) => statusOf(data.ks[x.kanji]) === "green");
  const rencana = useMemo(() => buildSession(data, t), [data, t]);
  const adaBelajar = rencana.quiz.length + rencana.write.length;
  const bawah = useMemo(() => tingkatBawah(data), [data.tg, data.ks]);

  return (
    <div className={memilih ? "pb-24" : ""}>
      <h1 className="font-merek text-[1.75rem] leading-tight tracking-normal text-tinta">Ngaji Kanji</h1>
      <p className="text-sm mt-1 text-redup">
        {parse(t).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <BannerPasang />

      <div className="flex flex-wrap gap-2 mt-4">
        {TINGKAT.map((tg) => (
          <Chip key={tg} aktifnya={data.tg === tg} onClick={() => ubah((d) => ({ ...d, tg }))}>{`sampai ${labelTingkat(tg)}`}</Chip>
        ))}
      </div>


      {bawah.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-white border border-garis">
          <p className="font-bold text-sm">Sudah menguasai {bawah.map(labelTingkat).join(" dan ")}?</p>
          <p className="text-sm mt-1 text-redup">
            Ikuti tes penempatan (sekitar {TOTAL_SOAL} soal). Tingkat yang lulus langsung ditandai hafal,
            jadi tidak perlu mengulang dari awal.
          </p>
          <Btn kind="ghost" className="mt-3" onClick={() => onMulai("tes")}>Mulai tes penempatan</Btn>
        </div>
      )}

      <p className="text-sm mt-5">Kanji hafal: <b>{hafal.length}</b> dari {set.length}</p>

      <div className="space-y-3 mt-6">
        <Btn onClick={() => onMulai("learn")} disabled={adaBelajar === 0}>Lanjutkan belajar</Btn>
        <Btn kind="ghost" onClick={mulaiMemilih} disabled={memilih}>Pilih kanji yang ingin dipelajari</Btn>
        {adaBelajar === 0 && (
          <p className="text-sm text-center text-redup">Belum ada kanji yang perlu dilatih sekarang. Kanji berikutnya muncul besok.</p>
        )}
      </div>

      <div className="mt-8 scroll-mt-4" ref={petaRef}>
        {memilih && (
          <p className="text-sm">Ketuk kanji yang ingin dipelajari (maksimum {MAKS}), lalu tekan Mulai di bawah.</p>
        )}
        <PetaKanji data={data} t={t} pilihan={pilihan} onPilih={memilih ? togel : undefined} />
      </div>

      <button type="button" onClick={onTentang} className="block mx-auto mt-10 text-sm underline text-redup min-h-11">
        Tentang aplikasi dan sumber materi
      </button>
      {memilih && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-white border-t border-garis pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
            <Btn kind="ghost" className="!w-auto" onClick={selesaiMemilih}>Batal</Btn>
            <Btn disabled={pilihan.length === 0} onClick={() => { onMulai("pilih", pilihan); selesaiMemilih(); }}>
              {pilihan.length === 0 ? "Pilih kanji dulu" : `Mulai (${pilihan.length}/${MAKS})`}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
