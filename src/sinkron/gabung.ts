import type { AppData, KanjiState, LogSesi, Tingkat } from "../types";

/** Baris profil di server. */
export interface ProfilServer {
  tg: Tingkat;
  ujian: string | null;
  offset: number;
  lastAcc: number | null;
  diubah: string;
}

/** Keadaan murid menurut server. */
export interface DataServer {
  profil: ProfilServer | null;
  ks: Record<string, { data: KanjiState; diubah: string }>;
  log: LogSesi[];
}

export interface HasilGabung {
  /** keadaan gabungan yang dipakai aplikasi dan ditulis ke IndexedDB */
  data: AppData;
  /** kanji yang versi lokalnya lebih baru, jadi harus dikirim ke server */
  dorongKs: string[];
  /** entri log yang belum ada di server */
  dorongLog: LogSesi[];
  /** meta lokal lebih baru daripada profil di server */
  dorongMeta: boolean;
}

// Rekaman tanpa cap waktu dianggap paling tua. Ini hanya jaring pengaman:
// `muat()` sudah menstempel rekaman lama sebelum penggabungan pertama jalan.
const PALING_TUA = "1970-01-01T00:00:00.000Z";
const cap = (s?: string | null): string => s || PALING_TUA;

/**
 * Menggabungkan keadaan lokal dengan keadaan server.
 *
 * Aturannya sengaja sederhana dan bisa diramalkan: **per kanji**, yang cap
 * waktunya paling akhir yang menang — bukan yang hitungannya paling tinggi.
 * Kalau memakai "hitungan tertinggi", jawaban salah di HP kedua bisa tertimpa
 * oleh rekaman lama yang masih menyimpan hitungan tinggi, sehingga aturan
 * "salah sekali -> hitungan kembali ke nol" bocor.
 *
 * Fungsi ini murni: tidak menyentuh jaringan, tidak memakai jam maupun angka
 * acak, sehingga perilakunya bisa diuji.
 */
export function gabung(lokal: AppData, server: DataServer): HasilGabung {
  // ---- kanji: per rekaman, cap waktu terakhir yang menang
  const ks: Record<string, KanjiState> = {};
  const dorongKs: string[] = [];
  const semuaKanji = new Set([...Object.keys(lokal.ks), ...Object.keys(server.ks)]);

  for (const k of semuaKanji) {
    const l = lokal.ks[k];
    const s = server.ks[k];
    if (l && !s) {
      ks[k] = l;
      dorongKs.push(k);
    } else if (!l && s) {
      ks[k] = s.data;
    } else if (l && s) {
      const capL = cap(l.diubah);
      const capS = cap(s.diubah);
      if (capL > capS) {
        ks[k] = l;
        dorongKs.push(k);
      } else if (capL < capS) {
        ks[k] = s.data;
      } else {
        // Cap waktu sama. Pertahankan yang lokal, dan kirim hanya kalau isinya
        // memang berbeda, supaya kedua sisi tetap menyatu.
        ks[k] = l;
        if (JSON.stringify(l) !== JSON.stringify(s.data)) dorongKs.push(k);
      }
    }
  }

  // ---- log sesi: gabungan menurut id, tambah-saja
  const idServer = new Set(server.log.map((e) => e.id).filter(Boolean) as string[]);
  const idTerpakai = new Set(idServer);
  const dorongLog: LogSesi[] = [];
  const log: LogSesi[] = [...server.log];

  for (const e of lokal.log) {
    if (e.id && idServer.has(e.id)) continue; // sudah ada di server
    if (e.id && idTerpakai.has(e.id)) continue; // kembar di dalam data lokal sendiri
    log.push(e);
    if (e.id) {
      idTerpakai.add(e.id);
      dorongLog.push(e);
    }
    // Entri tanpa id tidak bisa dijamin tidak dobel, jadi disimpan lokal saja.
    // `muat()` menstempel id, jadi ini praktisnya tidak terjadi.
  }

  log.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));

  // ---- meta: satu cap waktu untuk tg/ujian/offset/lastAcc sekaligus
  const capMetaL = cap(lokal.metaDiubah);
  const capMetaS = cap(server.profil?.diubah);
  const metaServerMenang = Boolean(server.profil) && capMetaS > capMetaL;

  const meta = metaServerMenang
    ? {
        tg: server.profil!.tg,
        ujian: server.profil!.ujian,
        offset: server.profil!.offset,
        lastAcc: server.profil!.lastAcc,
        metaDiubah: server.profil!.diubah,
      }
    : {
        tg: lokal.tg,
        ujian: lokal.ujian,
        offset: lokal.offset,
        lastAcc: lokal.lastAcc,
        metaDiubah: lokal.metaDiubah,
      };

  return {
    data: { ...lokal, ...meta, ks, log },
    dorongKs,
    dorongLog,
    dorongMeta: !metaServerMenang && (!server.profil || capMetaL > capMetaS),
  };
}
