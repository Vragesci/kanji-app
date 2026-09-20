import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Kosakata } from "../../types";
import { Btn, Jp } from "../komponen";

/** Sesi menulis: murid menulis kanji di kanvas, lalu menilai sendiri. Urutan goresan menyusul di tahap 3. */
export function SoalTulis({ k, v, onSelesai }: { k: string; v: Kosakata; onSelesai: (ok: boolean) => void }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const menggambar = useRef(false);
  const [panduan, setPanduan] = useState(true);
  const PIKSEL = 560;

  const hapus = () => {
    const c = kanvas.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };
  useEffect(hapus, [panduan]);

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
      <p className="text-sm text-redup">Sesi tulis {panduan ? "(dengan panduan)" : "(tanpa panduan)"}</p>
      <p className="text-center mt-2">
        <span className="font-bold">{v.arti}</span>: <Jp>{v.kana}</Jp> <span className="text-redup">({v.romaji})</span>
      </p>

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

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Btn kind="ghost" onClick={hapus}>Hapus</Btn>
        {panduan
          ? <Btn onClick={() => setPanduan(false)}>Tulis tanpa panduan</Btn>
          : <Btn kind="ghost" onClick={() => setPanduan(true)}>Lihat panduan</Btn>}
      </div>

      {!panduan && (
        <div className="mt-4">
          <p className="text-sm text-center mb-2 text-redup">Bandingkan dengan panduan. Apakah tulisanmu sudah benar?</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={() => onSelesai(false)}>Belum, ulang lain kali</Btn>
            <Btn onClick={() => onSelesai(true)}>Sudah benar</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
