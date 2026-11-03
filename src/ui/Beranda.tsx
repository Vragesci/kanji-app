import { useMemo, useRef, useState } from "react";
import { TINGKAT, labelTingkat } from "../data/katalog";
import { statusOf } from "../engine/fsrs";
import { buildSession, aktif } from "../engine/sesi";
import { TOTAL_SOAL, jumlahPutih, tingkatBawah } from "../engine/penempatan";
import { diff, parse } from "../engine/tanggal";
import type { AppData, ModeSesi, Tingkat } from "../types";
import { Btn, NamaAplikasi } from "./komponen";
import { PetaKanji } from "./PetaKanji";
import { DetailKanji } from "./DetailKanji";
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
  data: AppData; t: string; ubah: (fn: (d: AppData) => AppData) => void; onMulai: (m: ModeSesi, pilihan?: string[], tes?: Tingkat) => void; onTentang: () => void;
}) {
  const [memilih, setMemilih] = useState(false);
  const [pilihan, setPilihan] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
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
  const dipelajari = set.filter((x) => statusOf(data.ks[x.kanji]) !== "white").length;
  const naikMinggu = set.filter((x) => {
    const p = data.ks[x.kanji]?.naikPada;
    return !!p && diff(p, t) >= 0 && diff(p, t) <= 6;
  }).length;
  const rencana = useMemo(() => buildSession(data, t), [data, t]);
  const adaBelajar = rencana.quiz.length + rencana.write.length;
  const bawah = useMemo(() => tingkatBawah(data), [data.tg, data.ks, data.tesSelesai]);

  return (
    <div className={memilih ? "pb-24" : ""}>
      <NamaAplikasi className="text-[1.75rem]" />
      <p className="text-sm mt-1 text-redup">
        {parse(t).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <BannerPasang />

      <div className="flex flex-wrap gap-2 mt-4">
        {TINGKAT.map((tg) => (
          <Chip key={tg} aktifnya={data.tg === tg} onClick={() => ubah((d) => ({ ...d, tg }))}>{`sampai ${labelTingkat(tg)}`}</Chip>
        ))}
      </div>


      {/*
        Tes penempatan per tingkat (2026-11-03). Dulu satu tombol menguji semua tingkat bawah
        sekaligus dengan 5–6 soal per tingkat, dan 18 soal bisa menandai 689 kanji sebagai hafal.
        Sekarang murid memilih satu tingkat, 20 soal, dan jumlah kanji yang dipertaruhkan
        disebutkan sebelum tes dimulai.
      */}
      {bawah.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-white border border-garis">
          <p className="font-bold text-sm">Sudah menguasai tingkat di bawah {labelTingkat(data.tg || "N5")}?</p>
          <p className="text-sm mt-1 text-redup">
            Ikuti tes penempatan {TOTAL_SOAL} soal untuk satu tingkat. Kalau lulus (16 benar),
            semua kanji tingkat itu ditandai hafal dan diulang lagi dalam 1–3 minggu.
            Tiap tingkat hanya bisa dites <b>sekali</b>.
          </p>
          <div className="space-y-2 mt-3">
            {bawah.map((tg) => (
              <Btn key={tg} kind="ghost" onClick={() => onMulai("tes", undefined, tg)}>
                {`Tes ${labelTingkat(tg)} — ${jumlahPutih(data, tg)} kanji dipertaruhkan`}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/*
        Kemajuan (2026-11-02): dulu beranda hanya menampilkan "Kanji hafal", padahal hijau baru
        didapat setelah lima jawaban benar dan satu sesi menulis — murid baru melihat angka 0
        selama berhari-hari walau kanji yang dipelajarinya terus bertambah. Tiga angka di bawah
        bergerak di sesi pertama.
      */}
      <div className="mt-5 p-4 rounded-xl bg-white border border-garis">
        <p className="text-sm">Sudah dipelajari: <b>{dipelajari}</b> dari {set.length} kanji</p>
        <p className="text-sm mt-1">Sudah hafal: <b>{hafal.length}</b></p>
        <p className="text-sm mt-1 text-redup">
          {naikMinggu > 0
            ? `Tujuh hari terakhir: ${naikMinggu} kanji naik tingkat.`
            : "Tujuh hari terakhir: belum ada kanji yang naik tingkat."}
        </p>
      </div>

      <div className="space-y-3 mt-6">
        <Btn onClick={() => onMulai("learn")} disabled={adaBelajar === 0}>Lanjutkan belajar</Btn>
        <Btn kind="ghost" onClick={mulaiMemilih} disabled={memilih}>Pilih kanji yang ingin dipelajari</Btn>
        {adaBelajar === 0 && (
          <p className="text-sm text-center text-redup">Belum ada kanji yang perlu dilatih sekarang. Kanji berikutnya muncul besok.</p>
        )}
      </div>

      <div className="mt-8 scroll-mt-4" ref={petaRef}>
        {memilih ? (
          <p className="text-sm">Ketuk kanji yang ingin dipelajari (maksimum {MAKS}), lalu tekan Mulai di bawah.</p>
        ) : (
          <p className="text-sm text-redup">Ketuk kanji untuk melihat on-yomi, kun-yomi, dan contoh katanya.</p>
        )}
        <PetaKanji data={data} t={t} pilihan={pilihan} onPilih={memilih ? togel : undefined} onBuka={setDetail} />
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
      {detail && <DetailKanji k={detail} data={data} onTutup={() => setDetail(null)} />}
    </div>
  );
}
