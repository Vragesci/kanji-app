import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Kosakata } from "../../types";
import { Btn, Jp } from "../komponen";
import { keRomaji } from "../../engine/romaji";

/**
 * Sesi menulis (alur 2026-10-16): murid menulis dulu tanpa panduan, lalu mencocokkan dengan kanji yang benar.
 * Kalau belum benar, barulah panduan muncul untuk dijiplak. Urutan goresan menyusul di tahap 3.
 */
type Tahap = "tulis" | "cek" | "jiplak";
export function SoalTulis({ k, v, onSelesai }: { k: string; v: Kosakata; onSelesai: (ok: boolean) => void }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const menggambar = useRef(false);
  const [tahap, setTahap] = useState<Tahap>("tulis");
  const panduan = tahap !== "tulis";
  const PIKSEL = 560;

  const hapus = () => {
    const c = kanvas.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };
  // kanvas dikosongkan saat mulai menjiplak; saat "cek" tulisan murid tetap terlihat di atas panduan
  useEffect(() => { if (tahap === "jiplak") hapus(); }, [tahap]);

  const posisi = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const c = kanvas.current!;
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const turun = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    menggambar.current = true;
    const ctx = kanvas.current!.getContext("2d")!;
    const [x, y] = posisi(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    kanvas.current!.setPointerCapture(e.pointerId);
  };
  const gerak = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!menggambar.current) return;
    const ctx = kanvas.current!.getContext("2d")!;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D2330";
    const [x, y] = posisi(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const angkat = () => { menggambar.current = false; };

  return (
    <div className="mt-6">
      <p className="text-sm text-redup">
        {tahap === "tulis" ? "Tulis kanjinya tanpa melihat" : tahap === "cek" ? "Cocokkan tulisanmu" : "Jiplak panduan ini"}
      </p>
      <Petunjuk k={k} v={v} terbuka={tahap !== "tulis"} />

      <div className="relative mx-auto mt-4 rounded-2xl bg-white border border-garis w-full max-w-70 aspect-square overflow-hidden [container-type:inline-size]">
        {/* garis silang tengah sebagai patokan proporsi */}
        <div className="absolute left-1/2 inset-y-0 w-px bg-garis pointer-events-none" />
        <div className="absolute top-1/2 inset-x-0 h-px bg-garis pointer-events-none" />
        {panduan && (
          <Jp as="div" className="absolute inset-0 flex items-center justify-center pointer-events-none text-panduan leading-none" style={{ fontSize: "78cqw" }}>
            {k}
          </Jp>
        )}
        <canvas
          ref={kanvas} width={PIKSEL} height={PIKSEL}
          role="img" aria-label="Area menulis kanji: gambar dengan jari atau pena" className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={turun} onPointerMove={gerak} onPointerUp={angkat} onPointerLeave={angkat}
        />
      </div>

      {tahap === "tulis" && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Btn kind="ghost" onClick={hapus}>Hapus</Btn>
          <Btn onClick={() => setTahap("cek")}>Cek tulisan</Btn>
        </div>
      )}

      {tahap === "cek" && (
        <div className="mt-4">
          <p className="text-sm text-center mb-2 text-redup">Kanji yang benar tampil di belakang tulisanmu. Apakah sudah benar?</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={() => setTahap("jiplak")}>Belum benar</Btn>
            <Btn onClick={() => onSelesai(true)}>Sudah benar</Btn>
          </div>
        </div>
      )}

      {tahap === "jiplak" && (
        <div className="mt-4">
          <p className="text-sm text-center mb-2 text-redup">Jiplak kanji di atas. Kanji ini akan diulang lain kali.</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={hapus}>Hapus</Btn>
            <Btn onClick={() => onSelesai(false)}>Selesai menjiplak</Btn>
          </div>
        </div>
      )}
    </div>
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
