import { useMemo, useRef, useState } from "react";
import { KAMUS, kataTulis, labelTingkat } from "../data/katalog";
import { applyAnswer, applyWrite } from "../engine/penilaian";
import { buildSession, sesiPilihan } from "../engine/sesi";
import { nilaiPenempatan, sesiPenempatan, tandaiSudahTahu, type HasilTingkat, type SoalPenempatan } from "../engine/penempatan";
import { statusOf } from "../engine/fsrs";
import type { AppData, ItemSoal, ModeSesi, Tingkat } from "../types";
import { Btn, Jp, KotakKanji } from "./komponen";
import { Soal } from "./soal/Soal";
import { SoalTulis } from "./soal/SoalTulis";

type Fase = "quiz" | "write" | "done";

interface Props {
  mode: ModeSesi;
  /** kanji pilihan murid (mode "pilih") */
  pilihan?: string[];
  /** tingkat yang diuji (mode "tes"); satu tes = satu tingkat */
  tes?: Tingkat;
  data: AppData;
  t: string;
  ubah: (fn: (d: AppData) => AppData) => void;
  onKeluar: () => void;
}

export function Sesi({ mode, pilihan, tes, data, t: tHariIni, ubah, onKeluar }: Props) {
  // tanggal dikunci saat sesi dimulai: sesi yang melewati tengah malam tetap satu tanggal
  const [t] = useState(tHariIni);
  const [rencana] = useState(() =>
    mode === "tes" ? { quiz: tes ? sesiPenempatan(data, tes) : [], write: [] as string[] }
    : mode === "pilih" ? sesiPilihan(data, pilihan ?? []) : buildSession(data, t));
  // status kanji saat sesi dimulai: tombol "Sudah tahu" hanya untuk kanji yang baru pertama kali muncul
  const [awal] = useState(() => data.ks);
  const [hasilTes, setHasilTes] = useState<HasilTingkat[] | null>(null);
  const [dilewati, setDilewati] = useState(0);
  // tepat sesuai rencana (maksimum 10 soal); soal yang salah tidak diulang di sesi yang sama, jadwalnya maju ke sesi berikutnya
  const quiz: ItemSoal[] = rencana.quiz;
  const [tulis, setTulis] = useState<string[]>(rencana.write);
  const [fase, setFase] = useState<Fase>(rencana.quiz.length ? "quiz" : rencana.write.length ? "write" : "done");
  const [idx, setIdx] = useState(0);
  const [wIdx, setWIdx] = useState(0);
  const [acc, setAcc] = useState<number | null>(null);
  const [hijauBaru, setHijauBaru] = useState<string[]>([]);
  // percobaan pertama tiap kanji di sesi ini: hanya jawaban pertama yang dinilai
  const pertama = useRef<Record<string, boolean>>({});
  // kanji yang ditandai "sudah tahu": soal ulangannya di sesi ini ikut dilewati
  const lewati = useRef<Set<string>>(new Set());

  const selesaiQuiz = () => {
    if (mode === "tes") {
      // tes penempatan tidak memengaruhi beban sesi (lastAcc) maupun log latihan
      setHasilTes(nilaiPenempatan(data, quiz as SoalPenempatan[], pertama.current, t).hasil);
      ubah((d) => nilaiPenempatan(d, quiz as SoalPenempatan[], pertama.current, t).data);
      setFase("done");
      return;
    }
    const hasil = Object.values(pertama.current);
    const a = hasil.length ? hasil.filter(Boolean).length / hasil.length : 1;
    const entri = { d: t, n: hasil.length, acc: a };
    // hanya sesi belajar yang menggeser beban sesi berikutnya (lastAcc)
    ubah((d) => (mode === "learn" ? { ...d, lastAcc: a, log: [...d.log, entri] } : { ...d, log: [...d.log, entri] }));
    // menulis hanya untuk kanji yang sudah menunggu sebelum sesi ini dimulai; yang baru mencapai benar ke-5 menulis di sesi berikutnya
    const daftar = mode === "learn" ? rencana.write : [];
    setAcc(a);
    setTulis(daftar);
    setWIdx(0);
    setFase(daftar.length ? "write" : "done");
  };

  const dijawab = (benar: boolean) => {
    const it = quiz[idx]!;
    if (it.k in pertama.current) return;
    pertama.current[it.k] = benar;
    if (mode !== "tes") ubah((d) => applyAnswer(d, it.k, benar, t)); // tes penempatan dinilai di akhir
  };

  const sudahTahu = () => {
    const k = quiz[idx]!.k;
    lewati.current.add(k); // kanji yang sama bisa muncul lagi sebagai soal ulangan di sesi ini
    ubah((d) => tandaiSudahTahu(d, k, t, idx));
    setDilewati((n) => n + 1);
    lanjutQuiz();
  };

  const lanjutQuiz = () => {
    let n = idx + 1;
    while (n < quiz.length && lewati.current.has(quiz[n]!.k)) n++;
    if (n >= quiz.length) return selesaiQuiz();
    setIdx(n);
  };

  const selesaiTulis = (ok: boolean) => {
    const k = tulis[wIdx]!;
    ubah((d) => applyWrite(d, k, ok, t));
    if (ok) setHijauBaru((h) => [...h, k]);
    if (wIdx + 1 >= tulis.length) setFase("done");
    else setWIdx(wIdx + 1);
  };

  const progres = fase === "quiz" ? idx / Math.max(1, quiz.length) : 1;

  // Dibandingkan dengan status kanji saat sesi dimulai, bukan dengan hitungan jawaban benar:
  // kanji yang sama bisa muncul dua kali dalam satu sesi, dan ulangannya tidak dinilai.
  const kemajuan = useMemo(() => {
    let baru = 0;
    let maju = 0;
    for (const k of new Set(quiz.map((x) => x.k))) {
      const a = awal[k];
      const b = data.ks[k];
      if (!b) continue;
      if (!a?.seen) baru++;
      if ((b.count || 0) > (a?.count || 0) || (b.green && !a?.green)) maju++;
    }
    return { baru, maju };
  }, [data.ks, awal, quiz]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onKeluar} aria-label="Keluar dari sesi"
          className="text-2xl size-11 shrink-0 rounded-full bg-white border border-garis">×</button>
        <div className="flex-1 h-2 rounded-full bg-garis" role="progressbar" aria-label="Kemajuan sesi" aria-valuenow={Math.round(progres * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-aksen transition-[width] duration-300" style={{ width: `${progres * 100}%` }} />
        </div>
      </div>

      {fase === "quiz" && (
        <Soal
          key={`${idx}${quiz[idx]!.k}${quiz[idx]!.type}`}
          item={quiz[idx]!} data={data} onDijawab={dijawab} onLanjut={lanjutQuiz}
          onSudahTahu={mode !== "tes" && statusOf(awal[quiz[idx]!.k]) === "white" && !(quiz[idx]!.k in pertama.current) ? sudahTahu : undefined}
        />
      )}

      {fase === "write" && (
        <SoalTulis key={tulis[wIdx]} k={tulis[wIdx]!} v={KAMUS[kataTulis(tulis[wIdx]!, data.tg || "N5")]!} onSelesai={selesaiTulis} />
      )}

      {fase === "done" && (
        <div className="mt-10 text-center">
          <Jp as="p" className="text-4xl text-aksen">おつかれさま</Jp>
          <p className="text-sm text-redup">otsukaresama</p>
          {hasilTes && (
            <div className="mt-6 space-y-2 text-left">
              {hasilTes.map((h) => (
                <p key={h.tingkat} className="p-3 rounded-xl bg-white border border-garis text-sm">
                  <b>{labelTingkat(h.tingkat)}</b>: benar {h.benar} dari {h.total} —{" "}
                  {h.lulus
                    ? <span className="text-hijau font-bold">lulus, {h.ditandai} kanji ditandai hafal</span>
                    : <span className="text-merah font-bold">belum lulus, kanji tingkat ini dipelajari seperti biasa</span>}
                </p>
              ))}
            </div>
          )}
          {dilewati > 0 && <p className="mt-4 text-sm">Ditandai sudah tahu: <b>{dilewati}</b> kanji</p>}
          {/* kemajuan sesi ini (2026-11-02): angka yang bergerak walau belum ada kanji yang hijau */}
          {mode !== "tes" && (kemajuan.baru > 0 || kemajuan.maju > 0) && (
            <p className="mt-4 text-sm">
              {kemajuan.baru > 0 && <>Kanji baru dikenalkan: <b>{kemajuan.baru}</b></>}
              {kemajuan.baru > 0 && kemajuan.maju > 0 && " · "}
              {kemajuan.maju > 0 && <>Naik tingkat: <b>{kemajuan.maju}</b></>}
            </p>
          )}
          {acc !== null && (
            <p className="mt-6">Jawaban benar di percobaan pertama: <b>{Math.round(acc * 100)}%</b></p>
          )}
          {hijauBaru.length > 0 && (
            <div className="mt-5">
              <p className="text-sm">Kanji yang kini hafal:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {hijauBaru.map((k) => <KotakKanji key={k} k={k} s={data.ks[k]} t={t} />)}
              </div>
            </div>
          )}
          <Btn className="mt-8" onClick={onKeluar}>Kembali ke beranda</Btn>
        </div>
      )}
    </div>
  );
}
