import { describe, expect, it } from "vitest";
import { KOSONG } from "../db/penyimpanan";
import type { AppData, KanjiState, LogSesi } from "../types";
import { gabung, type DataServer } from "./gabung";

const lokalBaru = (o: Partial<AppData> = {}): AppData => ({ ...KOSONG, ...o });
const serverKosong = (): DataServer => ({ profil: null, ks: {}, log: [] });

const st = (o: Partial<KanjiState> = {}): KanjiState =>
  ({ seen: true, vi: 0, count: 0, wrongStreak: 0, ...o });

const T1 = "2026-09-20T10:00:00.000Z";
const T2 = "2026-09-21T10:00:00.000Z";
const T3 = "2026-09-22T10:00:00.000Z";

describe("penggabungan kanji", () => {
  it("server masih kosong: semua rekaman lokal dipertahankan dan dikirim", () => {
    const lokal = lokalBaru({ ks: { 先: st({ count: 3, diubah: T1 }) } });
    const h = gabung(lokal, serverKosong());
    expect(h.data.ks["先"]!.count).toBe(3);
    expect(h.dorongKs).toEqual(["先"]);
  });

  it("perangkat baru tanpa data lokal: rekaman server dipakai, tidak ada yang dikirim", () => {
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 4 }), diubah: T2 } } };
    const h = gabung(lokalBaru(), server);
    expect(h.data.ks["先"]!.count).toBe(4);
    expect(h.dorongKs).toEqual([]);
  });

  it("bentrok: cap waktu lokal lebih baru -> lokal menang dan dikirim", () => {
    const lokal = lokalBaru({ ks: { 先: st({ count: 5, diubah: T3 }) } });
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 2 }), diubah: T1 } } };
    const h = gabung(lokal, server);
    expect(h.data.ks["先"]!.count).toBe(5);
    expect(h.dorongKs).toEqual(["先"]);
  });

  it("bentrok: cap waktu server lebih baru -> server menang dan tidak dikirim", () => {
    const lokal = lokalBaru({ ks: { 先: st({ count: 5, diubah: T1 }) } });
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 2 }), diubah: T3 } } };
    const h = gabung(lokal, server);
    expect(h.data.ks["先"]!.count).toBe(2);
    expect(h.dorongKs).toEqual([]);
  });

  it("aturan 'salah sekali -> hitungan nol' tidak boleh dibangkitkan lagi oleh rekaman lama", () => {
    // HP A menjawab benar 4 kali (lama). HP B lalu menjawab salah (baru) -> count 0.
    // Yang paling akhir harus menang, meskipun hitungannya lebih rendah.
    const lokal = lokalBaru({ ks: { 先: st({ count: 0, salahTotal: 1, wrongStreak: 1, diubah: T3 }) } });
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 4 }), diubah: T1 } } };
    const h = gabung(lokal, server);
    expect(h.data.ks["先"]!.count).toBe(0);
    expect(h.data.ks["先"]!.wrongStreak).toBe(1);
  });

  it("rekaman tanpa cap waktu dianggap paling tua", () => {
    const lokal = lokalBaru({ ks: { 先: st({ count: 9 }) } }); // tanpa diubah
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 1 }), diubah: T1 } } };
    const h = gabung(lokal, server);
    expect(h.data.ks["先"]!.count).toBe(1);
  });

  it("cap waktu sama dan isi sama: tidak perlu dikirim", () => {
    const sama = st({ count: 3, diubah: T2 });
    const lokal = lokalBaru({ ks: { 先: sama } });
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: { ...sama }, diubah: T2 } } };
    expect(gabung(lokal, server).dorongKs).toEqual([]);
  });

  it("cap waktu sama tapi isi berbeda: lokal dipertahankan lalu dikirim supaya menyatu", () => {
    const lokal = lokalBaru({ ks: { 先: st({ count: 3, diubah: T2 }) } });
    const server: DataServer = { ...serverKosong(), ks: { 先: { data: st({ count: 7, diubah: T2 }), diubah: T2 } } };
    const h = gabung(lokal, server);
    expect(h.data.ks["先"]!.count).toBe(3);
    expect(h.dorongKs).toEqual(["先"]);
  });

  it("kanji dari dua perangkat digabung, bukan saling menghapus", () => {
    const lokal = lokalBaru({ ks: { 先: st({ diubah: T1 }) } });
    const server: DataServer = { ...serverKosong(), ks: { 年: { data: st(), diubah: T1 } } };
    const h = gabung(lokal, server);
    expect(Object.keys(h.data.ks).sort()).toEqual(["先", "年"]);
  });
});

describe("penggabungan log sesi", () => {
  const e = (id: string, d: string, acc = 0.8): LogSesi => ({ id, d, n: 10, acc });

  it("entri yang sudah ada di server tidak dikirim ulang dan tidak dobel", () => {
    const lokal = lokalBaru({ log: [e("a", "2026-09-20")] });
    const server: DataServer = { ...serverKosong(), log: [e("a", "2026-09-20")] };
    const h = gabung(lokal, server);
    expect(h.data.log).toHaveLength(1);
    expect(h.dorongLog).toEqual([]);
  });

  it("entri lokal yang belum ada di server dikirim", () => {
    const lokal = lokalBaru({ log: [e("a", "2026-09-20"), e("b", "2026-09-21")] });
    const server: DataServer = { ...serverKosong(), log: [e("a", "2026-09-20")] };
    const h = gabung(lokal, server);
    expect(h.data.log).toHaveLength(2);
    expect(h.dorongLog.map((x) => x.id)).toEqual(["b"]);
  });

  it("riwayat dua perangkat digabung dan tersusun menurut tanggal", () => {
    const lokal = lokalBaru({ log: [e("b", "2026-09-22")] });
    const server: DataServer = { ...serverKosong(), log: [e("a", "2026-09-20")] };
    const h = gabung(lokal, server);
    expect(h.data.log.map((x) => x.d)).toEqual(["2026-09-20", "2026-09-22"]);
  });

  it("dua sesi di hari yang sama dengan angka sama tetap dua entri (bukan dianggap kembar)", () => {
    const lokal = lokalBaru({ log: [e("a", "2026-09-20"), e("b", "2026-09-20")] });
    const h = gabung(lokal, serverKosong());
    expect(h.data.log).toHaveLength(2);
    expect(h.dorongLog).toHaveLength(2);
  });
});

describe("penggabungan meta", () => {
  it("profil server lebih baru: tingkat dan tanggal ujian diambil dari server", () => {
    const lokal = lokalBaru({ tg: "N5", ujian: null, metaDiubah: T1 });
    const server: DataServer = {
      ...serverKosong(),
      profil: { tg: "N3", ujian: "2026-12-06", offset: 0, lastAcc: 0.9, diubah: T3 },
    };
    const h = gabung(lokal, server);
    expect(h.data.tg).toBe("N3");
    expect(h.data.ujian).toBe("2026-12-06");
    expect(h.dorongMeta).toBe(false);
  });

  it("meta lokal lebih baru: dipertahankan lalu dikirim", () => {
    const lokal = lokalBaru({ tg: "N2", metaDiubah: T3 });
    const server: DataServer = {
      ...serverKosong(),
      profil: { tg: "N5", ujian: null, offset: 0, lastAcc: null, diubah: T1 },
    };
    const h = gabung(lokal, server);
    expect(h.data.tg).toBe("N2");
    expect(h.dorongMeta).toBe(true);
  });

  it("server belum punya profil: meta lokal dikirim", () => {
    const h = gabung(lokalBaru({ tg: "N3", metaDiubah: T1 }), serverKosong());
    expect(h.data.tg).toBe("N3");
    expect(h.dorongMeta).toBe(true);
  });
});
