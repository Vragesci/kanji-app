import { describe, expect, it } from "vitest";
import { KOSONG } from "../db/penyimpanan";
import type { AppData, KanjiState } from "../types";
import { stempel } from "./stempel";

const T_LAMA = "2026-09-20T10:00:00.000Z";
const T_BARU = "2026-09-22T10:00:00.000Z";
const d = (o: Partial<AppData> = {}): AppData => ({ ...KOSONG, ...o });
const st = (o: Partial<KanjiState> = {}): KanjiState => ({ seen: true, vi: 0, count: 0, wrongStreak: 0, ...o });

describe("stempel", () => {
  it("kanji yang berubah dapat cap waktu baru", () => {
    const lama = d({ ks: { 先: st({ count: 1, diubah: T_LAMA }) } });
    const baru = d({ ks: { 先: st({ count: 2, diubah: T_LAMA }) } });
    expect(stempel(lama, baru, T_BARU).ks["先"]!.diubah).toBe(T_BARU);
  });

  it("kanji yang tidak tersentuh tidak ikut distempel", () => {
    const tetap = st({ count: 1, diubah: T_LAMA });
    const lama = d({ ks: { 先: tetap, 年: st({ diubah: T_LAMA }) } });
    const baru = d({ ks: { 先: tetap, 年: st({ count: 3, diubah: T_LAMA }) } });
    const h = stempel(lama, baru, T_BARU);
    expect(h.ks["先"]!.diubah).toBe(T_LAMA);
    expect(h.ks["年"]!.diubah).toBe(T_BARU);
  });

  it("entri log baru diberi id, entri lama tidak diubah", () => {
    const lama = d({ log: [{ id: "a", d: "2026-09-20", n: 10, acc: 0.8 }] });
    const baru = d({ log: [...lama.log, { d: "2026-09-22", n: 10, acc: 0.9 }] });
    const h = stempel(lama, baru, T_BARU);
    expect(h.log[0]!.id).toBe("a");
    expect(h.log[1]!.id).toBeTruthy();
  });

  it("perubahan meta memperbarui metaDiubah", () => {
    const lama = d({ tg: "N5", metaDiubah: T_LAMA });
    expect(stempel(lama, d({ tg: "N3", metaDiubah: T_LAMA }), T_BARU).metaDiubah).toBe(T_BARU);
    expect(stempel(lama, d({ ujian: "2026-12-06", metaDiubah: T_LAMA }), T_BARU).metaDiubah).toBe(T_BARU);
  });

  it("tanpa perubahan meta, metaDiubah tidak bergerak", () => {
    const tetap = st({ diubah: T_LAMA });
    const lama = d({ tg: "N5", metaDiubah: T_LAMA, ks: { 先: tetap } });
    const baru = d({ tg: "N5", metaDiubah: T_LAMA, ks: { 先: st({ count: 1, diubah: T_LAMA }) } });
    expect(stempel(lama, baru, T_BARU).metaDiubah).toBe(T_LAMA);
  });
});
