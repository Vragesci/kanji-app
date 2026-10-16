import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Kosakata } from "../../types";
import { Btn, Jp } from "../komponen";
import { keRomaji } from "../../engine/romaji";
import { KMAP } from "../../data/katalog";
import { muatGoresan, nilaiTulisan, pesanKoreksi, type Goresan, type Hasil } from "../../engine/goresan";

/**
 * Sesi menulis (2026-10-16): murid menulis dulu tanpa panduan, lalu aplikasi menilai sendiri tiap goresan
 * (jumlah, urutan, arah, bentuk/letak) dengan data KanjiVG. Kalau belum benar, urutan goresan bernomor
 * ditampilkan dan murid menjiplaknya; kanji itu diulang lain kali. Kalau data goresan tidak bisa dimuat
 * (mis. luring sebelum pernah diunduh), murid menilai sendiri seperti sebelumnya.
 */
type Tahap = "tulis" | "benar" | "koreksi" | "nilaiSendiri" | "jiplak";
const PIKSEL = 560;

export function SoalTulis({ k, v, onSelesai }: { k: string; v: Kosakata; onSelesai: (ok: boolean) => void }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const goresan = useRef<Goresan[]>([]);
  const [jumlah, setJumlah] = useState(0);
  const [tahap, setTahap] = useState<Tahap>("tulis");
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [jalur, setJalur] = useState<string[] | null | undefined>(undefined); // undefined = memuat, null = gagal

  useEffect(() => {
    let aktif = true;
    muatGoresan(KMAP[k]!.tingkat)
      .then((d) => { if (aktif) setJalur(d[k] ?? null); })
      .catch(() => { if (aktif) setJalur(null); });
    return () => { aktif = false; };
  }, [k]);

  const gambarUlang = () => {
    const c = kanvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D2330";
    for (const g of goresan.current) {
      ctx.beginPath();
      g.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (g.length === 1) ctx.lineTo(g[0]![0] + 0.1, g[0]![1]);
      ctx.stroke();
    }
  };
  const hapus = () => { goresan.current = []; setJumlah(0); gambarUlang(); };
  const urungkan = () => { goresan.current = goresan.current.slice(0, -1); setJumlah(goresan.current.length); gambarUlang(); };
  // mulai menjiplak dengan kanvas kosong
  useEffect(() => { if (tahap === "jiplak") hapus(); }, [tahap]);

  const posisi = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const c = kanvas.current!;
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const menggambar = useRef(false);
  const bolehMenulis = tahap === "tulis" || tahap === "jiplak";
  const turun = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!bolehMenulis) return;
    e.preventDefault();
    menggambar.current = true;
    goresan.current = [...goresan.current, [posisi(e)]];
    kanvas.current!.setPointerCapture(e.pointerId);
    gambarUlang();
  };
  const gerak = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!menggambar.current) return;
    goresan.current.at(-1)!.push(posisi(e));
    gambarUlang();
  };
  const angkat = () => {
    if (!menggambar.current) return;
    menggambar.current = false;
    setJumlah(goresan.current.length);
  };

  const cek = () => {
    if (!jalur) { setTahap("nilaiSendiri"); return; }
    const h = nilaiTulisan(goresan.current, jalur);
    setHasil(h);
    setTahap(h.ok ? "benar" : "koreksi");
  };

  // goresan KanjiVG yang perlu ditandai merah saat koreksi
  const salahKe = hasil && !hasil.ok && hasil.jenis !== "jumlah" ? hasil.ke : null;
  const tampilJalur = tahap === "benar" || tahap === "koreksi" || tahap === "jiplak";

  return (
    <div className="mt-6">
      <p className="text-sm text-redup">
        {tahap === "tulis" ? "Tulis kanjinya tanpa melihat" : tahap === "jiplak" ? "Jiplak sesuai urutan nomor" : "Hasil tulisanmu"}
      </p>
      <Petunjuk k={k} v={v} terbuka={tahap !== "tulis"} />

      <div className="relative mx-auto mt-4 rounded-2xl bg-white border border-garis w-full max-w-70 aspect-square overflow-hidden [container-type:inline-size]">
        {/* garis silang tengah sebagai patokan proporsi */}
        <div className="absolute left-1/2 inset-y-0 w-px bg-garis pointer-events-none" />
        <div className="absolute top-1/2 inset-x-0 h-px bg-garis pointer-events-none" />
        {tampilJalur && jalur && <UrutanGoresan jalur={jalur} sorot={salahKe} />}
        {tahap === "nilaiSendiri" && (
          <Jp as="div" className="absolute inset-0 flex items-center justify-center pointer-events-none text-panduan leading-none" style={{ fontSize: "78cqw" }}>
            {k}
          </Jp>
        )}
        <canvas
          ref={kanvas} width={PIKSEL} height={PIKSEL}
          role="img" aria-label="Area menulis kanji: gambar dengan jari atau pena" className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={turun} onPointerMove={gerak} onPointerUp={angkat} onPointerCancel={angkat} onPointerLeave={angkat}
        />
      </div>

      {tahap === "tulis" && (
        <div className="mt-4">
          <p className="text-xs text-center mb-2 text-redup">Goresan ditulis: {jumlah}</p>
          <div className="grid grid-cols-3 gap-2">
            <Btn kind="ghost" onClick={urungkan} disabled={jumlah === 0}>Urungkan</Btn>
            <Btn kind="ghost" onClick={hapus} disabled={jumlah === 0}>Hapus</Btn>
            <Btn onClick={cek} disabled={jumlah === 0 || jalur === undefined}>Cek</Btn>
          </div>
        </div>
      )}

      {(tahap === "benar" || tahap === "koreksi") && hasil && (
        <div className="mt-4" aria-live="polite">
          <p className={`font-bold ${hasil.ok ? "text-hijau" : "text-merah"}`}>{hasil.ok ? "Benar" : "Belum tepat"}</p>
          <p className="text-sm mt-1">{pesanKoreksi(hasil)}</p>
          {hasil.ok
            ? <Btn className="mt-4" onClick={() => onSelesai(true)}>Lanjut</Btn>
            : <Btn className="mt-4" onClick={() => setTahap("jiplak")}>Jiplak sesuai urutan</Btn>}
        </div>
      )}

      {tahap === "nilaiSendiri" && (
        <div className="mt-4">
          <p className="text-sm text-center mb-2 text-redup">Data urutan goresan belum terunduh (perlu internet sekali). Bandingkan sendiri: apakah tulisanmu sudah benar?</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={() => setTahap("jiplak")}>Belum benar</Btn>
            <Btn onClick={() => onSelesai(true)}>Sudah benar</Btn>
          </div>
        </div>
      )}

      {tahap === "jiplak" && (
        <div className="mt-4">
          <p className="text-sm text-center mb-2 text-redup">Ikuti nomor goresan. Kanji ini akan diulang lain kali.</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={hapus}>Hapus</Btn>
            <Btn onClick={() => onSelesai(false)}>Selesai menjiplak</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/** Jalur goresan KanjiVG bernomor sesuai urutan; goresan `sorot` ditandai merah. */
function UrutanGoresan({ jalur, sorot }: { jalur: string[]; sorot: number | null }) {
  return (
    <svg viewBox="0 0 109 109" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      {jalur.map((d, i) => (
        <path key={i} d={d} fill="none" strokeWidth={sorot === i + 1 ? 5 : 4} strokeLinecap="round" strokeLinejoin="round"
          className={sorot === i + 1 ? "stroke-merah" : "stroke-panduan"} />
      ))}
      {jalur.map((d, i) => {
        const m = /M\s*([\d.]+)[ ,]*([\d.-]+)/.exec(d);
        if (!m) return null;
        return (
          <text key={`n${i}`} x={Number(m[1]) - 3} y={Number(m[2]) - 2} fontSize={8} textAnchor="end"
            className={sorot === i + 1 ? "fill-merah font-bold" : "fill-redup"}>{i + 1}</text>
        );
      })}
    </svg>
  );
}

/**
 * Petunjuk soal tulis: kata dengan kanji target dikosongkan (学□) dan bacaan kanji itu ditandai,
 * supaya jelas yang ditulis hanya satu kanji (生 = せい), bukan seluruh kata (学生).
 */
function Petunjuk({ k, v, terbuka }: { k: string; v: Kosakata; terbuka: boolean }) {
  const segTarget = v.seg_valid ? v.seg.find((s) => s[0] === k) : undefined;
  const bacaan = segTarget?.[1];
  const kosong = (
    <span className="inline-block align-middle w-[1.1em] h-[1.1em] mx-px rounded border-2 border-dashed border-aksen" aria-label="kanji yang ditulis" />
  );
  const kata = segTarget
    ? v.seg.map((s, i) => (s[0] === k ? (terbuka ? <span key={i} className="text-aksen">{k}</span> : <span key={i}>{kosong}</span>) : <span key={i}>{s[0]}</span>))
    : [...v.seg.map((s) => s[0]).join("")].map((c, i) => (c === k ? (terbuka ? <span key={i} className="text-aksen">{c}</span> : <span key={i}>{kosong}</span>) : <span key={i}>{c}</span>));
  return (
    <div className="text-center mt-2">
      <p className="font-bold">{v.arti}</p>
      <Jp as="p" className="text-3xl mt-1">{kata}</Jp>
      <p className="mt-1">
        {segTarget ? (
          <Jp>{v.seg.map((s, i) => (s[0] === k ? <b key={i} className="text-aksen">{s[1]}</b> : <span key={i}>{s[1] || s[0]}</span>))}</Jp>
        ) : (
          <Jp>{v.kana}</Jp>
        )}{" "}
        <span className="text-redup">({v.romaji})</span>
      </p>
      {bacaan && v.seg.length > 1 && (
        <p className="text-sm mt-1 text-redup">
          Tulis kanji untuk <Jp className="text-tinta font-bold">{bacaan}</Jp> ({keRomaji(bacaan)})
        </p>
      )}
    </div>
  );
}
