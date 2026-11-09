import { useState } from "react";
import { ambilPeristiwa, hapusPeristiwa } from "../db/penyimpanan";
import { fmt } from "../engine/tanggal";
import type { AppData } from "../types";
import { VERSI } from "../versi";
import { Btn, Jp, NamaAplikasi } from "./komponen";
import { PanduanPasang } from "./PetunjukPasang";

const CC = "https://creativecommons.org/licenses/by-sa/4.0/";
const EDRDG = "https://www.edrdg.org/";

function Tautan({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-aksen">{children}</a>;
}

export function Tentang({ data, ubah, onKembali }: {
  data: AppData;
  ubah: (fn: (d: AppData) => AppData) => void;
  onKembali: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onKembali} aria-label="Kembali ke beranda"
          className="text-2xl size-11 shrink-0 rounded-full bg-white border border-garis">←</button>
        <h1 className="text-2xl font-bold">Tentang</h1>
      </div>

      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <section>
          <NamaAplikasi as="h2" className="text-lg" />
          <p className="mt-2">
            Aplikasi belajar kanji berbahasa Indonesia untuk calon pekerja dan pemagang ke Jepang, serta murid kelas daring.
            Urutan kanji mengikuti buku <i>Irodori</i>, dan soalnya memakai kosakata utuh, bukan huruf lepas.
          </p>
          <p className="mt-2">
            Kemajuan belajarmu tersimpan di perangkat ini saja. Tidak ada akun dan tidak ada data yang dikirim ke server.
          </p>
        </section>

        <PanduanPasang />

        <section>
          <h2 className="font-bold text-base">Sumber materi</h2>
          <ul className="mt-2 space-y-3">
            <li>
              <b>Irodori</b> (<Jp>いろどり</Jp>) — materi tingkat JFT, level <Jp>入門</Jp> (Nyuumon),
              {" "}<Jp>初級1</Jp> (Shokyuu 1), dan <Jp>初級2</Jp> (Shokyuu 2), berasal dari{" "}
              <i>Irodori</i> oleh The Japan Foundation.
            </li>
            <li>
              <b>JMdict, KANJIDIC2, dan KRADFILE</b> — bacaan, komponen kanji, dan sebagian kosakata berasal dari berkas milik{" "}
              <Tautan href={EDRDG}>Electronic Dictionary Research and Development Group (EDRDG)</Tautan>,
              dipakai di bawah lisensi <Tautan href={CC}>Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)</Tautan>.
            </li>
            <li>
              <b>KanjiVG</b> — urutan dan bentuk goresan untuk pengecekan tulisan berasal dari{" "}
              <Tautan href="https://kanjivg.tagaini.net">KanjiVG</Tautan> © Ulrich Apel, dipakai di bawah lisensi{" "}
              <Tautan href="https://creativecommons.org/licenses/by-sa/3.0/">Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)</Tautan>.
            </li>
          </ul>
        </section>

        <CatatanBelajar data={data} ubah={ubah} />

        <section>
          <h2 className="font-bold text-base">Tentang arti bahasa Indonesia</h2>
          <p className="mt-2">
            Sebagian arti diterjemahkan dari JMdict dengan bantuan AI. Arti kosakata N5, N2, dan N1 sudah dicocokkan dengan
            kamus daring, sedangkan arti N3 dan JFT (Irodori) masih dalam pemeriksaan. Kalau menemukan arti yang janggal,
            sampaikan ke pengajarmu.
          </p>
        </section>
      </div>

      <Btn className="mt-8" onClick={onKembali}>Kembali ke beranda</Btn>
      <p className="mt-6 text-center text-xs text-redup">Versi {VERSI}</p>
    </div>
  );
}

/**
 * Catatan belajar (Tahap 1b, 2026-11-09). Semuanya tetap di perangkat murid: tidak ada
 * pengiriman otomatis. Satu-satunya jalan keluar adalah tombol ekspor di bawah, yang
 * dipakai murid sendiri kalau diminta pengajar.
 */
function CatatanBelajar({ data, ubah }: { data: AppData; ubah: (fn: (d: AppData) => AppData) => void }) {
  const aktif = data.rekam !== false;
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const ganti = (nyala: boolean) => {
    setPesan(null);
    ubah((d) => ({ ...d, rekam: nyala }));
    // dimatikan = catatan yang sudah ada ikut dihapus, bukan sekadar berhenti bertambah
    if (!nyala) void hapusPeristiwa().catch(() => { /* tidak kritis */ });
  };

  const ekspor = async () => {
    setSibuk(true);
    setPesan(null);
    try {
      const peristiwa = await ambilPeristiwa().catch(() => []);
      const isi = { versi: VERSI, dibuat: new Date().toISOString(), ks: data.ks, log: data.log, peristiwa };
      const url = URL.createObjectURL(new Blob([JSON.stringify(isi)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ngaji-kanji-${fmt(new Date())}.json`;
      // tautan dipasang ke halaman dulu (sebagian peramban HP mengabaikan tautan lepas), dan
      // alamat blob baru dilepas setelah unduhan sempat mulai — melepasnya langsung setelah
      // click() kadang membatalkan unduhan di Safari
      a.style.display = "none";
      document.body.append(a);
      a.click();
      window.setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 10_000);
      setPesan(`Berkas dibuat: ${peristiwa.length} catatan soal.`);
    } catch {
      setPesan("Berkasnya gagal dibuat. Coba lagi lewat peramban (bukan aplikasi terpasang).");
    } finally {
      setSibuk(false);
    }
  };

  return (
    <section>
      <h2 className="font-bold text-base">Bantu tingkatkan aplikasi ini</h2>
      <p className="mt-2">
        Kalau dinyalakan, aplikasi mencatat tiap soal yang kamu kerjakan: kanji dan kata yang muncul, jenis soalnya,
        benar atau salah, berapa lama kamu menjawab, dan — pada soal tulis — alasan goresanmu ditolak. Catatan itu
        dipakai memperbaiki soal dan melonggarkan pengecek tulisan yang terlalu galak.
      </p>
      <p className="mt-2">
        Catatan ini tersimpan di HP-mu saja dan tidak dikirim ke mana pun. Tidak ada nama, tidak ada nomor, dan tidak
        ada tulisan bebas — hanya huruf kanji dan angka. Berkasnya baru keluar kalau kamu sendiri menekan tombol
        ekspor di bawah dan mengirimkannya ke pengajarmu.
      </p>
      <label className="mt-3 flex items-center gap-3 min-h-11">
        <input type="checkbox" checked={aktif} onChange={(e) => ganti(e.target.checked)} className="size-5 accent-aksen" />
        <span>Catat soal yang saya kerjakan</span>
      </label>
      <Btn kind="ghost" className="mt-2" onClick={() => void ekspor()} disabled={sibuk}>
        {sibuk ? "Menyiapkan…" : "Ekspor data belajar"}
      </Btn>
      {pesan && <p className="mt-2 text-xs text-redup" aria-live="polite">{pesan}</p>}
    </section>
  );
}
