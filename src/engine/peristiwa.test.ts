import { describe, expect, it } from "vitest";
import type { Peristiwa } from "../types";
import type { Hasil } from "./goresan";
import { MAKS_PERISTIWA, batasiPeristiwa, buatPeristiwa, capWaktu, dariHasil, idSesi } from "./peristiwa";

const isi = (o: Partial<Peristiwa> = {}) => ({
  sid: "abc12345", kanji: "先", kata: "先生", jenis: "meaning" as const, mode: "learn" as const,
  hasil: "benar" as const, ms: 4200, ke: 1, ...o,
});

describe("cap waktu", () => {
  it("waktu lokal, bukan UTC — hari murid ganti di tempatnya sendiri", () => {
    const d = new Date(2026, 10, 9, 17, 4, 31); // 9 November 2026, 17:04:31 waktu lokal
    expect(capWaktu(d)).toMatch(/^2026-11-09T17:04:31(Z|[+-]\d{2}:\d{2})$/);
  });
});

describe("membangun satu baris log", () => {
  it("menambahkan waktu dan versi aplikasi", () => {
    const p = buatPeristiwa(isi(), new Date(2026, 10, 9, 8, 0, 0), "0.1.0+2026-11-09 09:30Z");
    expect(p.v).toBe("0.1.0+2026-11-09 09:30Z");
    expect(p.t.startsWith("2026-11-09T08:00:00")).toBe(true);
    expect(p.kanji).toBe("先");
    expect(p.ms).toBe(4200);
  });

  it("membuang ruas yang kosong supaya berkas ekspornya rapat", () => {
    const p = buatPeristiwa(isi({ kata: undefined, manual: undefined, gagal: 0 }));
    expect("kata" in p).toBe(false);
    expect("manual" in p).toBe(false);
    expect("tolak" in p).toBe(false);
    expect(p.gagal).toBe(0); // nol itu nilai, bukan ketiadaan
  });
});

describe("alasan pengecek goresan menolak", () => {
  it("tulisan yang diterima tidak meninggalkan alasan", () => {
    expect(dariHasil({ ok: true })).toEqual({});
  });

  it("jumlah goresan: ikut mencatat ditulis vs seharusnya", () => {
    const h: Hasil = { ok: false, jenis: "jumlah", ditulis: 5, seharusnya: 6 };
    expect(dariHasil(h)).toEqual({ tolak: "jumlah", ditulis: 5, seharusnya: 6 });
  });

  it("alasan lain: mencatat goresan ke berapa yang ditolak", () => {
    expect(dariHasil({ ok: false, jenis: "arah", ke: 2 })).toEqual({ tolak: "arah", tolakKe: 2 });
    expect(dariHasil({ ok: false, jenis: "urutan", ke: 3, mirip: 1 })).toEqual({ tolak: "urutan", tolakKe: 3 });
    expect(dariHasil({ ok: false, jenis: "panjang", ke: 4, terlalu: "pendek" })).toEqual({ tolak: "panjang", tolakKe: 4 });
    expect(dariHasil({ ok: false, jenis: "bentuk", ke: 5 })).toEqual({ tolak: "bentuk", tolakKe: 5 });
  });

  it("menyatu dengan baris log soal tulis", () => {
    const h: Hasil = { ok: false, jenis: "panjang", ke: 2, terlalu: "pendek" };
    const p = buatPeristiwa(isi({ jenis: "tulis", hasil: "salah", gagal: 1, ...dariHasil(h) }));
    expect(p.tolak).toBe("panjang");
    expect(p.tolakKe).toBe(2);
    expect(p.gagal).toBe(1);
  });
});

describe("batas jumlah baris", () => {
  const banyak = (n: number) => Array.from({ length: n }, (_, i) => buatPeristiwa(isi({ ms: i })));

  it("daftar pendek dibiarkan utuh", () => {
    const d = banyak(10);
    expect(batasiPeristiwa(d, 5000)).toHaveLength(10);
  });

  it("yang tertua dibuang, yang terbaru disimpan", () => {
    const d = banyak(12);
    const sisa = batasiPeristiwa(d, 5);
    expect(sisa).toHaveLength(5);
    expect(sisa[0]!.ms).toBe(7);
    expect(sisa.at(-1)!.ms).toBe(11);
  });

  it("batas bawaan 5.000 baris", () => {
    expect(MAKS_PERISTIWA).toBe(5000);
  });
});

describe("id sesi", () => {
  it("8 huruf dan berbeda tiap sesi", () => {
    const a = idSesi();
    expect(a).toHaveLength(8);
    expect(new Set(Array.from({ length: 50 }, idSesi)).size).toBeGreaterThan(45);
  });
});
