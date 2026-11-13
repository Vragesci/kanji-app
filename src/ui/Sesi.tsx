import { useEffect, useMemo, useRef, useState } from "react";
import { KAMUS, kataTulis, labelTingkat } from "../data/katalog";
import { applyAnswer, applyWrite } from "../engine/penilaian";
import { buildSession, sesiPilihan } from "../engine/sesi";
import { nilaiPenempatan, sesiPenempatan, tandaiSudahTahu, type HasilTingkat, type SoalPenempatan } from "../engine/penempatan";
import { statusOf } from "../engine/fsrs";
import { buatPeristiwa, dariHasil, idSesi, type IsiPeristiwa } from "../engine/peristiwa";
import { catatPeristiwa } from "../db/penyimpanan";
import type { AppData, ItemSoal, ModeSesi, Tingkat } from "../types";
import { Btn, Jp, KotakKanji } from "./komponen";
import { bunyi } from "../suara";
import { bintang, jumlahHafal, pangkatDari } from "../engine/permainan";
import { Soal } from "./soal/Soal";
import { SoalTulis, type PercobaanTulis } from "./soal/SoalTulis";

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
  /** mulai sesi belajar baru dari layar hasil */
  onLagi: () => void;
}

export function Sesi({ mode, pilihan, tes, data, t: tHariIni, ubah, onKeluar, onLagi }: Props) {
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
  // ——— Tampilan game (2026-11-13): kombo dan warna per soal. Hanya tampilan dan bunyi; tidak ikut menilai. ———
  const [kombo, setKombo] = useState(0);
  const komboTerbaik = useRef(0);
  const [hasilSoal, setHasilSoal] = useState<Record<number, boolean>>({});

  // ——— Log belajar per soal (Tahap 1b) ———
  // Satu baris per jawaban, di samping LogSesi yang tetap memegang beban sesi (lastAcc).
  // Mencatat tidak boleh menggagalkan sesi: kegagalannya diabaikan diam-diam.
  const [sid] = useState(idSesi);
  const percobaan = useRef<Record<string, number>>({});
  const tampilPada = useRef(Date.now());
  const sudahJawab = useRef(false);
  useEffect(() => { tampilPada.current = Date.now(); sudahJawab.current = false; }, [fase, idx, wIdx]);

  const rekam = (isi: Omit<IsiPeristiwa, "sid" | "mode" | "ke">) => {
    sudahJawab.current = true;
    if (data.rekam === false) return;
    const ke = (percobaan.current[isi.kanji] = (percobaan.current[isi.kanji] || 0) + 1);
    try {
      void catatPeristiwa(buatPeristiwa({ ...isi, sid, mode, ke })).catch(() => { /* log tidak kritis */ });
    } catch { /* log tidak kritis */ }
  };
  const lamanya = () => Date.now() - tampilPada.current;
  const kataTulisKini = (k: string) => kataTulis(k, data.tg || "N5");

  /** Keluar di tengah sesi dicatat sebagai "lewat" pada soal yang sedang terbuka. */
  const keluar = () => {
    if (!sudahJawab.current) {
      if (fase === "quiz" && quiz[idx]) {
        rekam({ kanji: quiz[idx]!.k, kata: quiz[idx]!.kata, jenis: quiz[idx]!.type, hasil: "lewat", ms: lamanya() });
      } else if (fase === "write" && tulis[wIdx]) {
        rekam({ kanji: tulis[wIdx]!, kata: kataTulisKini(tulis[wIdx]!), jenis: "tulis", hasil: "lewat", ms: lamanya() });
      }
    }
    onKeluar();
  };

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
    // dicatat juga untuk soal ulangan yang tidak dinilai: jawabannya tetap jawaban murid
    rekam({ kanji: it.k, kata: it.kata, jenis: it.type, hasil: benar ? "benar" : "salah", ms: lamanya() });
    setHasilSoal((h) => ({ ...h, [idx]: benar }));
    if (benar) {
      const n = kombo + 1;
      setKombo(n);
      komboTerbaik.current = Math.max(komboTerbaik.current, n);
      if (n >= 3) bunyi.kombo(); else bunyi.benar();
    } else {
      setKombo(0);
      bunyi.salah();
    }
    if (it.k in pertama.current) return;
    pertama.current[it.k] = benar;
    if (mode !== "tes") ubah((d) => applyAnswer(d, it.k, benar, t)); // tes penempatan dinilai di akhir
  };

  const sudahTahu = () => {
    const it = quiz[idx]!;
    const k = it.k;
    rekam({ kanji: k, kata: it.kata, jenis: it.type, hasil: "sudahTahu", ms: lamanya() });
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

  /**
   * Satu percobaan menulis. Dicatat tiap percobaan, bukan hanya yang terakhir: alasan
   * pengecek goresan menolak (`tolak`) adalah bagian paling berharga dari log ini —
   * dari situlah ketahuan toleransi mana di `BATAS` yang perlu dilonggarkan.
   */
  const percobaanTulis = (p: PercobaanTulis) => {
    const k = tulis[wIdx]!;
    rekam({
      kanji: k, kata: kataTulisKini(k), jenis: "tulis", hasil: p.hasil, ms: p.ms,
      ...(p.tolakan ? dariHasil(p.tolakan) : {}),
      gagal: data.ks[k]?.gagalTulis || 0,
      manual: p.manual,
    });
  };

  const selesaiTulis = (ok: boolean) => {
    const k = tulis[wIdx]!;
    ubah((d) => applyWrite(d, k, ok, t));
    if (ok) { setHijauBaru((h) => [...h, k]); bunyi.naik(); }
    if (wIdx + 1 >= tulis.length) setFase("done");
    else setWIdx(wIdx + 1);
  };

  const progres = fase === "quiz" ? idx / Math.max(1, quiz.length) : 1;

  // bunyi penutup untuk sesi yang berakhir baik; dilewati kalau sesi menulis baru saja membunyikannya
  useEffect(() => {
    if (fase === "done" && mode !== "tes" && acc !== null && acc >= 0.7 && hijauBaru.length === 0) bunyi.naik();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const suaraNyala = data.suara !== false;
  const dinilai = Object.values(pertama.current);
  const nBenar = dinilai.filter(Boolean).length;
  const nBintang = acc === null ? 0 : bintang(acc);
  const hafal = useMemo(() => jumlahHafal(data), [data.ks]);
  const pos = pangkatDari(hafal);
  const bisaLagi = useMemo(() => {
    if (fase !== "done" || mode === "tes") return false;
    const b = buildSession(data, t);
    return b.quiz.length + b.write.length > 0;
  }, [fase, mode, data, t]);

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
        <button type="button" onClick={keluar} aria-label="Keluar dari sesi"
          className="text-2xl size-11 shrink-0 rounded-full bg-kartu border border-garis">×</button>
        {fase === "quiz" ? (
          <div className="flex-1 flex gap-1" role="progressbar" aria-label="Kemajuan sesi" aria-valuenow={Math.round(progres * 100)} aria-valuemin={0} aria-valuemax={100}>
            {quiz.map((_, i) => (
              <i key={i} className={`block h-2.5 flex-1 rounded-full ${i in hasilSoal ? (hasilSoal[i] ? "bg-hijau" : "bg-merah") : i === idx ? "bg-aksen" : "bg-garis"}`} />
            ))}
          </div>
        ) : (
          <div className="flex-1 h-2.5 rounded-full bg-garis" role="progressbar" aria-label="Kemajuan sesi" aria-valuenow={Math.round(progres * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2.5 rounded-full bg-aksen transition-[width] duration-300" style={{ width: `${progres * 100}%` }} />
          </div>
        )}
        {fase === "quiz" && <span className="text-sm font-bold tabular-nums">{idx + 1}/{quiz.length}</span>}
        <button type="button" onClick={() => ubah((d) => ({ ...d, suara: d.suara === false }))}
          aria-label={suaraNyala ? "Matikan suara" : "Nyalakan suara"} aria-pressed={suaraNyala}
          className={`size-11 shrink-0 rounded-full bg-kartu border border-garis flex items-center justify-center ${suaraNyala ? "text-aksen" : "text-redup"}`}>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            {suaraNyala ? <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></> : <path d="M17 9l5 6M22 9l-5 6" />}
          </svg>
        </button>
      </div>

      {fase === "quiz" && (
        <div className="h-9 mt-3 flex justify-center" aria-live="polite">
          {kombo >= 2 && (
            <p key={kombo} className="letup px-4 py-1 rounded-full bg-aksen text-latar font-extrabold shadow-[0_4px_0_#B98A14]">Kombo ×{kombo}</p>
          )}
        </div>
      )}

      {fase === "quiz" && (
        <Soal
          key={`${idx}${quiz[idx]!.k}${quiz[idx]!.type}`}
          item={quiz[idx]!} data={data} onDijawab={dijawab} onLanjut={lanjutQuiz}
          onSudahTahu={mode !== "tes" && statusOf(awal[quiz[idx]!.k]) === "white" && !(quiz[idx]!.k in pertama.current) ? sudahTahu : undefined}
        />
      )}

      {fase === "write" && (
        <SoalTulis key={tulis[wIdx]} k={tulis[wIdx]!} v={KAMUS[kataTulisKini(tulis[wIdx]!)]!}
          gagal={data.ks[tulis[wIdx]!]?.gagalTulis || 0} onSelesai={selesaiTulis} onPercobaan={percobaanTulis} />
      )}

      {fase === "done" && (
        <div className="mt-10 text-center">
          <Jp as="p" className="text-4xl text-aksen">おつかれさま</Jp>
          <p className="text-sm text-redup">otsukaresama</p>
          {hasilTes && (
            <div className="mt-6 space-y-2 text-left">
              {hasilTes.map((h) => (
                <p key={h.tingkat} className="p-3 rounded-xl bg-kartu border border-garis text-sm">
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
          {mode !== "tes" && acc === null && (kemajuan.baru > 0 || kemajuan.maju > 0) && (
            <p className="mt-4 text-sm">
              {kemajuan.baru > 0 && <>Kanji baru dikenalkan: <b>{kemajuan.baru}</b></>}
              {kemajuan.baru > 0 && kemajuan.maju > 0 && " · "}
              {kemajuan.maju > 0 && <>Naik tingkat: <b>{kemajuan.maju}</b></>}
            </p>
          )}
          {acc !== null && mode !== "tes" && (
            <>
              <div className="mt-5 flex items-end justify-center gap-2" role="img" aria-label={`${nBintang} dari 3 bintang`}>
                {[1, 2, 3].map((i) => <Bintang key={i} isi={i <= nBintang} besar={i === 2} tunda={i * 0.12} />)}
              </div>
              <p className="mt-3"><b className="text-2xl text-aksen">{nBenar}</b> dari {dinilai.length} benar di percobaan pertama</p>
              {nBintang < 3 && (
                <p className="text-xs text-redup mt-1">{nBintang === 1 ? "Bintang kedua: 70% benar" : "Bintang ketiga: lebih dari 90% benar"}</p>
              )}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Petak angka={`×${komboTerbaik.current}`} label="Kombo terbaik" />
                <Petak angka={kemajuan.maju} label="Naik tingkat" />
                <Petak angka={kemajuan.baru} label="Kanji baru" />
              </div>
            </>
          )}
          {hijauBaru.length > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-kartu border-2 border-aksen">
              <p className="text-xs font-extrabold tracking-wide text-aksen">KANJI BARU DIKUASAI</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {hijauBaru.map((k) => <KotakKanji key={k} k={k} s={data.ks[k]} t={t} ukuran={64} />)}
              </div>
            </div>
          )}
          {mode !== "tes" && (
            <div className="mt-5 p-4 rounded-2xl bg-kartu text-left">
              <div className="flex justify-between items-baseline text-sm">
                <span><Jp className="font-extrabold text-aksen">{pos.kini.jp}</Jp> {pos.kini.romaji}</span>
                {pos.berikut && <span className="text-redup"><Jp className="font-bold text-tinta">{pos.berikut.jp}</Jp> {pos.berikut.romaji}</span>}
              </div>
              <div className="mt-2 h-3 rounded-full bg-latar"><div className="h-3 rounded-full bg-aksen" style={{ width: `${Math.max(3, pos.porsi * 100)}%` }} /></div>
              <p className="text-xs text-redup mt-2">
                {pos.berikut ? `${hafal} kanji hafal · ${pos.kurang} lagi untuk naik pangkat` : `${hafal} kanji hafal · pangkat tertinggi`}
              </p>
            </div>
          )}
          {bisaLagi && <Btn className="mt-8" onClick={onLagi}>Main satu sesi lagi</Btn>}
          <Btn kind={bisaLagi ? "ghost" : "primary"} className={bisaLagi ? "mt-3" : "mt-8"} onClick={onKeluar}>Kembali ke beranda</Btn>
        </div>
      )}
    </div>
  );
}

function Bintang({ isi, besar, tunda }: { isi: boolean; besar: boolean; tunda: number }) {
  const u = besar ? 76 : 60;
  return (
    <svg aria-hidden width={u} height={u} viewBox="0 0 24 24" className={isi ? "letup" : ""} style={isi ? { animationDelay: `${tunda}s` } : undefined}
      fill={isi ? "#FFC83D" : "none"} stroke={isi ? "#B98A14" : "#5A66B5"} strokeWidth={isi ? 1.2 : 1.6} strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
    </svg>
  );
}

function Petak({ angka, label }: { angka: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-kartu py-3 px-1">
      <p className="text-2xl font-extrabold">{angka}</p>
      <p className="text-xs text-redup">{label}</p>
    </div>
  );
}
