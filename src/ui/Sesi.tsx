import { useRef, useState } from "react";
import { KAMUS, kosakataUntuk } from "../data/katalog";
import { applyAnswer, applyWrite } from "../engine/penilaian";
import { buildSession, daftarTulis } from "../engine/sesi";
import type { AppData, ItemSoal, ModeSesi } from "../types";
import { Btn, Jp, KotakKanji } from "./komponen";
import { Soal } from "./soal/Soal";
import { SoalTulis } from "./soal/SoalTulis";

type Fase = "quiz" | "write" | "done";

interface Props {
  mode: ModeSesi;
  data: AppData;
  t: string;
  ubah: (fn: (d: AppData) => AppData) => void;
  ambil: () => AppData;
  onKeluar: () => void;
}

export function Sesi({ mode, data, t: tHariIni, ubah, ambil, onKeluar }: Props) {
  // tanggal dikunci saat sesi dimulai: sesi yang melewati tengah malam tetap satu tanggal
  const [t] = useState(tHariIni);
  const [rencana] = useState(() => buildSession(data, t, mode));
  const [quiz, setQuiz] = useState<ItemSoal[]>(rencana.quiz);
  const [tulis, setTulis] = useState<string[]>(rencana.write);
  const [fase, setFase] = useState<Fase>(rencana.quiz.length ? "quiz" : rencana.write.length ? "write" : "done");
  const [idx, setIdx] = useState(0);
  const [wIdx, setWIdx] = useState(0);
  const [acc, setAcc] = useState<number | null>(null);
  const [hijauBaru, setHijauBaru] = useState<string[]>([]);
  // percobaan pertama tiap kanji di sesi ini: hanya jawaban pertama yang dinilai
  const pertama = useRef<Record<string, boolean>>({});

  const selesaiQuiz = () => {
    const hasil = Object.values(pertama.current);
    const a = hasil.length ? hasil.filter(Boolean).length / hasil.length : 1;
    const entri = { d: t, n: hasil.length, acc: a };
    // hanya sesi belajar yang menggeser beban sesi berikutnya (lastAcc)
    ubah((d) => (mode === "learn" ? { ...d, lastAcc: a, log: [...d.log, entri] } : { ...d, log: [...d.log, entri] }));
    const daftar = mode === "learn" ? daftarTulis(ambil()) : [];
    setAcc(a);
    setTulis(daftar);
    setWIdx(0);
    setFase(daftar.length ? "write" : "done");
  };

  const dijawab = (benar: boolean) => {
    const it = quiz[idx]!;
    if (it.practice || it.k in pertama.current) return;
    pertama.current[it.k] = benar;
    ubah((d) => applyAnswer(d, it.k, benar, t));
  };

  const lanjutQuiz = (benar: boolean) => {
    const it = quiz[idx]!;
    // yang salah diulang di akhir sesi sebagai latihan, tidak dihitung
    const q = !benar && !it.practice ? [...quiz, { ...it, practice: true }] : quiz;
    if (idx + 1 >= q.length) return selesaiQuiz();
    setQuiz(q);
    setIdx(idx + 1);
  };

  const selesaiTulis = (ok: boolean) => {
    const k = tulis[wIdx]!;
    ubah((d) => applyWrite(d, k, ok, t));
    if (ok) setHijauBaru((h) => [...h, k]);
    if (wIdx + 1 >= tulis.length) setFase("done");
    else setWIdx(wIdx + 1);
  };

  const progres = fase === "quiz" ? idx / Math.max(1, quiz.length) : 1;

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
          key={`${idx}${quiz[idx]!.k}${quiz[idx]!.type}${quiz[idx]!.practice ? "p" : ""}`}
          item={quiz[idx]!} data={data} onDijawab={dijawab} onLanjut={lanjutQuiz}
        />
      )}

      {fase === "write" && (
        <SoalTulis key={tulis[wIdx]} k={tulis[wIdx]!} v={KAMUS[kosakataUntuk(tulis[wIdx]!, 0, false)]!} onSelesai={selesaiTulis} />
      )}

      {fase === "done" && (
        <div className="mt-10 text-center">
          <Jp as="p" className="text-4xl text-aksen">おつかれさま</Jp>
          <p className="text-sm text-redup">otsukaresama</p>
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
