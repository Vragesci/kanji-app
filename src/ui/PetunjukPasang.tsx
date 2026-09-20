import { useState } from "react";
import { platformSaatIni, sudahTerpasang, usePasang } from "../pasang";
import { Btn } from "./komponen";

const KUNCI_TUTUP = "petunjuk-pasang-ditutup";
// hanya kenyamanan tampilan (bukan data belajar), jadi cukup localStorage; boleh gagal
const bacaTutup = () => { try { return localStorage.getItem(KUNCI_TUTUP) === "1"; } catch { return false; } };
const simpanTutup = () => { try { localStorage.setItem(KUNCI_TUTUP, "1"); } catch { /* abaikan */ } };

const ALASAN_IOS =
  "iPhone dapat menghapus kemajuan belajar yang tersimpan di browser kalau tidak dibuka sekitar seminggu. Aplikasi yang dipasang di layar utama tidak terkena aturan itu.";
const LANGKAH_IOS =
  "Ketuk tombol Bagikan (kotak dengan panah ke atas), lalu pilih “Tambah ke Layar Utama”. Kalau tombol itu tidak ada, buka tautan ini di Safari.";
const LANGKAH_ANDROID =
  "Buka menu browser (tiga titik), lalu pilih “Pasang aplikasi” atau “Tambahkan ke layar utama”.";

/** Kartu di beranda; hilang kalau sudah terpasang atau ditutup murid. */
export function BannerPasang() {
  const { bisaLangsung, pasang } = usePasang();
  const [ditutup, setDitutup] = useState(bacaTutup);
  const p = platformSaatIni();
  if (ditutup || sudahTerpasang() || (p === "lain" && !bisaLangsung)) return null;

  return (
    <section aria-label="Pasang di layar utama" className="mt-5 p-4 rounded-xl bg-white border border-garis text-sm">
      <p className="font-bold">Pasang di layar utama</p>
      {p === "ios" ? (
        <>
          <p className="mt-2">{ALASAN_IOS}</p>
          <p className="mt-2">{LANGKAH_IOS}</p>
        </>
      ) : (
        <p className="mt-2">
          Supaya mudah dibuka dari layar utama dan tetap jalan tanpa internet. {!bisaLangsung && LANGKAH_ANDROID}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3">
        {bisaLangsung && <Btn className="!w-auto !min-h-10 !py-2" onClick={() => void pasang()}>Pasang aplikasi</Btn>}
        <button type="button" onClick={() => { simpanTutup(); setDitutup(true); }} className="text-sm underline text-redup min-h-10">
          Nanti saja
        </button>
      </div>
    </section>
  );
}

/** Panduan lengkap untuk halaman Tentang: selalu tampil, semua perangkat. */
export function PanduanPasang() {
  return (
    <section>
      <h2 className="font-bold text-base">Pasang di layar utama</h2>
      <p className="mt-2">Aplikasi ini lebih nyaman dipakai kalau dipasang di layar utama: mudah dibuka dan tetap jalan tanpa internet.</p>
      <p className="mt-3"><b>iPhone dan iPad.</b> {LANGKAH_IOS}</p>
      <p className="mt-2">{ALASAN_IOS}</p>
      <p className="mt-3"><b>Android.</b> {LANGKAH_ANDROID}</p>
    </section>
  );
}
