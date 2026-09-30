import { useState } from "react";
import type { Setuju } from "../sinkron/useSetuju";
import type { StatusSinkron } from "../sinkron/useSinkron";
import { hapusAkun } from "../sinkron/sinkron";
import { Btn, Jp } from "./komponen";
import { PanduanPasang } from "./PetunjukPasang";

const CC = "https://creativecommons.org/licenses/by-sa/4.0/";
const EDRDG = "https://www.edrdg.org/";

function Tautan({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-aksen">{children}</a>;
}

const KATA_SINKRON: Record<StatusSinkron, string> = {
  mati: "Tidak aktif — data hanya di HP ini",
  sedang: "Menyinkronkan…",
  beres: "Tersinkron dengan server",
  luring: "Menunggu sambungan — kemajuanmu aman di HP ini",
  gagal: "Sinkronisasi gagal",
};

export function Tentang({
  onKembali, email, luring, statusSinkron, pesanSinkron, setuju,
  onSetuju, onTolakSinkron, onSinkronkan, onKeluar,
}: {
  onKembali: () => void;
  email: string | null;
  luring: boolean;
  statusSinkron: StatusSinkron;
  pesanSinkron: string | null;
  setuju: Setuju;
  onSetuju: () => void;
  onTolakSinkron: () => void;
  onSinkronkan: () => void;
  onKeluar: () => void;
}) {
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [sibukHapus, setSibukHapus] = useState(false);
  const [galatHapus, setGalatHapus] = useState<string | null>(null);

  const hapus = async () => {
    setGalatHapus(null);
    setSibukHapus(true);
    try {
      await hapusAkun();
      onKeluar();
    } catch (e) {
      setGalatHapus(e instanceof Error ? e.message : "Gagal menghapus akun. Coba lagi saat tersambung internet.");
    } finally {
      setSibukHapus(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onKembali} aria-label="Kembali ke beranda"
          className="text-2xl size-11 shrink-0 rounded-full bg-white border border-garis">←</button>
        <h1 className="text-2xl font-bold">Tentang</h1>
      </div>

      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-base">Aplikasi Kanji</h2>
          <p className="mt-2">
            Aplikasi belajar kanji berbahasa Indonesia untuk calon pekerja dan pemagang ke Jepang, serta murid kelas daring.
            Urutan kanji mengikuti buku <i>Irodori</i>, dan soalnya memakai kosakata utuh, bukan huruf lepas.
          </p>
          <p className="mt-2">
            Kemajuan belajarmu selalu disimpan di HP ini lebih dulu, jadi aplikasi tetap bisa dipakai tanpa internet.
            Kalau kamu mengizinkan, kemajuan itu juga disimpan di server supaya ikut pindah saat kamu berganti HP.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base">Akunmu</h2>
          <p className="mt-2">
            Masuk sebagai <b className="break-all">{email ?? "—"}</b>.
          </p>
          {luring && (
            <p className="mt-2 text-redup">
              Sekarang tanpa sambungan. Kamu tetap bisa belajar; kemajuanmu dikirim sendiri
              begitu internet tersambung lagi.
            </p>
          )}
          <p className="mt-2">
            Sinkronisasi: <b>{KATA_SINKRON[statusSinkron]}</b>
            {statusSinkron === "gagal" && pesanSinkron ? ` (${pesanSinkron})` : ""}
          </p>

          {setuju === "setuju" ? (
            <div className="mt-3 space-y-3">
              <Btn kind="ghost" onClick={onSinkronkan} disabled={statusSinkron === "sedang"}>
                Sinkronkan sekarang
              </Btn>
              <Btn kind="ghost" onClick={onTolakSinkron}>Berhenti menyimpan di server</Btn>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-redup">
                Kemajuanmu saat ini hanya tersimpan di HP ini, jadi tidak ikut pindah kalau kamu berganti HP.
              </p>
              <Btn kind="ghost" onClick={onSetuju}>Mulai simpan di server</Btn>
            </div>
          )}

          <div className="mt-3 space-y-3">
            <Btn kind="ghost" onClick={onKeluar}>Keluar dari akun</Btn>
          </div>
        </section>

        <section>
          <h2 className="font-bold text-base">Data dan privasi</h2>
          <p className="mt-2">
            Kalau sinkronisasi aktif, yang disimpan di server hanya: kanji yang sudah kamu pelajari beserta
            hitungan benar/salah dan jadwal ulangnya, riwayat sesi (tanggal, jumlah soal, ketepatan), tingkat
            dan tanggal ujian yang kamu pilih, serta alamat emailmu sebagai penanda akun.
          </p>
          <p className="mt-2">
            Tidak ada nama, umur, nomor HP, atau lokasi. <b>Hanya kamu</b> yang bisa membaca datamu: murid lain
            tidak bisa, dan pengajar tidak punya halaman untuk memantau kemajuan murid.
          </p>
          <p className="mt-2">
            Menghapus akun menghapus seluruh data itu dari server dan tidak bisa dibatalkan. Kemajuan yang
            tersimpan di HP ini tidak ikut terhapus.
          </p>
          {!konfirmasiHapus ? (
            <Btn kind="ghost" className="mt-3 !text-merah" onClick={() => setKonfirmasiHapus(true)}>
              Hapus akun dan semua datanya
            </Btn>
          ) : (
            <div className="mt-3 space-y-3">
              <p role="alert" className="font-bold text-merah">
                Hapus akun {email} beserta seluruh data belajarnya di server?
              </p>
              <Btn className="!bg-merah" onClick={() => void hapus()} disabled={sibukHapus}>
                {sibukHapus ? "Menghapus…" : "Ya, hapus sekarang"}
              </Btn>
              <Btn kind="ghost" onClick={() => setKonfirmasiHapus(false)} disabled={sibukHapus}>Batal</Btn>
            </div>
          )}
          {galatHapus && <p role="alert" className="mt-3 text-merah">{galatHapus}</p>}
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
          </ul>
        </section>

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
    </div>
  );
}
