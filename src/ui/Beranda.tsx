import { useMemo, useState } from "react";
import { TINGKAT } from "../data/katalog";
import { UJIAN, statusOf } from "../engine/fsrs";
import { buildSession, aktif } from "../engine/sesi";
import { diff, parse } from "../engine/tanggal";
import { KOSONG } from "../db/penyimpanan";
import type { AppData, ModeSesi } from "../types";
import { Btn } from "./komponen";
import { PetaKanji } from "./PetaKanji";
import { BannerPasang } from "./PetunjukPasang";

function Chip({ aktifnya, onClick, children }: { aktifnya: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktifnya}
      className={`px-3 min-h-9 rounded-full text-xs border ${aktifnya ? "border-aksen bg-aksen text-white" : "border-garis bg-white text-redup"}`}>
      {children}
    </button>
  );
}

/** Beranda: pengaturan dasar, tombol mulai, dan peta kanji. Tombol mulai di atas peta karena petanya panjang (hingga 1.377 kotak). */
export function Beranda({ data, t, ubah, onMulai, onTentang }: {
  data: AppData; t: string; ubah: (fn: (d: AppData) => AppData) => void; onMulai: (m: ModeSesi) => void; onTentang: () => void;
}) {
  const [alat, setAlat] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const set = useMemo(() => aktif(data), [data.tg]);
  const hafal = set.filter((x) => statusOf(data.ks[x.kanji]) === "green");
  const tersedia = hafal.filter((x) => data.ks[x.kanji]!.lastSeen !== t).length;
  const rencana = useMemo(() => buildSession(data, t, "learn"), [data, t]);
  const adaBelajar = rencana.quiz.length + rencana.write.length;
  const terakhir = data.log.slice(-5);
  const rata = terakhir.length ? Math.round((terakhir.reduce((a, b) => a + b.acc, 0) / terakhir.length) * 100) : null;
  const hariLatihan = new Set(data.log.map((l) => l.d)).size;

  return (
    <div>
      <h1 className="text-2xl font-bold">Aplikasi Kanji</h1>
      <p className="text-sm mt-1 text-redup">
        {parse(t).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <BannerPasang />

      <div className="flex flex-wrap gap-2 mt-4">
        {TINGKAT.map((tg) => (
          <Chip key={tg} aktifnya={data.tg === tg} onClick={() => ubah((d) => ({ ...d, tg }))}>{`sampai ${tg}`}</Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-redup">Target ujian:</span>
        {[...UJIAN, { label: "tanpa target", tgl: null as string | null }]
          .filter((u) => !u.tgl || u.tgl > t)
          .map((u) => (
            <Chip key={u.label} aktifnya={data.ujian === u.tgl} onClick={() => ubah((d) => ({ ...d, ujian: u.tgl }))}>{u.label}</Chip>
          ))}
      </div>
      {data.ujian && (
        <p className="text-xs mt-2 text-redup">
          {diff(t, data.ujian)} hari lagi — tidak ada kanji yang dijadwalkan melewati hari ujian.
        </p>
      )}

      <p className="text-sm mt-5">Kanji hafal: <b>{hafal.length}</b> dari {set.length}</p>

      <div className="space-y-3 mt-6">
        <Btn onClick={() => onMulai("learn")} disabled={adaBelajar === 0}>Lanjutkan belajar</Btn>
        <Btn kind="ghost" onClick={() => onMulai("review")} disabled={tersedia === 0}>Review kanji yang sudah hafal</Btn>
        {adaBelajar === 0 && (
          <p className="text-sm text-center text-redup">Sesi hari ini sudah selesai. Kanji berikutnya muncul besok.</p>
        )}
      </div>

      <div className="mt-8">
        <PetaKanji data={data} t={t} />
      </div>

      <div className="mt-10 p-4 rounded-xl bg-white border border-garis">
        <p className="font-bold text-sm">Data uji coba</p>
        <p className="text-sm mt-2">Hari latihan: {hariLatihan}</p>
        <p className="text-sm">Akurasi rata-rata 5 sesi terakhir: {rata === null ? "belum ada" : `${rata}%`}</p>
        <button type="button" onClick={() => setAlat(!alat)} className="text-xs mt-3 underline text-redup min-h-9">
          {alat ? "Sembunyikan alat uji" : "Alat uji (khusus guru)"}
        </button>
        {alat && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Btn kind="ghost" onClick={() => ubah((d) => ({ ...d, offset: d.offset + 1 }))}>Majukan 1 hari</Btn>
            {konfirmasi ? (
              <Btn kind="ghost" onClick={() => { ubah(() => KOSONG); setKonfirmasi(false); }}>Yakin, hapus</Btn>
            ) : (
              <Btn kind="ghost" onClick={() => setKonfirmasi(true)}>Mulai ulang</Btn>
            )}
          </div>
        )}
      </div>

      <button type="button" onClick={onTentang} className="block mx-auto mt-6 text-sm underline text-redup min-h-11">
        Tentang aplikasi dan sumber materi
      </button>
    </div>
  );
}
