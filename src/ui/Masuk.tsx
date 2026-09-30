import { useState } from "react";
import { supabaseSiap } from "../sinkron/klien";
import { Btn } from "./komponen";

type Tahap = "email" | "kode";

/**
 * Masuk lewat email, tanpa sandi.
 *
 * Email dari Supabase memuat dua jalan: sebuah tautan, dan kode 6 angka. Di
 * dalam aplikasi yang sudah dipasang ke layar utama, **kode** yang dipakai.
 * Alasannya: menekan tautan di email membuka peramban, bukan aplikasi
 * terpasang, sehingga sesinya tersimpan di tempat yang salah dan aplikasi
 * tetap tampak belum masuk. Mengetik kode membuat sesi lahir di aplikasi yang
 * benar-benar sedang dipakai murid.
 */
export function Masuk({
  kirimKode, verifikasiKode,
}: {
  kirimKode: (email: string) => Promise<string | null>;
  verifikasiKode: (email: string, kode: string) => Promise<string | null>;
}) {
  const [tahap, setTahap] = useState<Tahap>("email");
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  if (!supabaseSiap) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Belum bisa masuk</h1>
        <p role="alert" className="mt-4 text-sm leading-relaxed">
          Aplikasi ini dibangun tanpa alamat dan kunci server, jadi akun belum bisa dipakai.
          Kalau kamu yang memasang aplikasi ini, isi <code>VITE_SUPABASE_URL</code> dan{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> lalu bangun ulang.
        </p>
      </div>
    );
  }

  const kirim = async () => {
    setGalat(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setGalat("Alamat email belum benar.");
      return;
    }
    setSibuk(true);
    const e = await kirimKode(email);
    setSibuk(false);
    if (e) { setGalat(e); return; }
    setTahap("kode");
  };

  const verifikasi = async () => {
    setGalat(null);
    if (kode.replace(/\D/g, "").length < 6) {
      setGalat("Kode terdiri dari 6 angka.");
      return;
    }
    setSibuk(true);
    const e = await verifikasiKode(email, kode);
    setSibuk(false);
    if (e) setGalat(e);
    // Berhasil: useAkun menangkap sesinya dan layar ini berganti sendiri.
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Masuk</h1>
      <p className="mt-2 text-sm text-redup leading-relaxed">
        Tidak perlu sandi. Kamu cukup memasukkan email, lalu mengetik kode 6 angka yang dikirim ke email itu.
      </p>
      <p className="mt-2 text-sm text-redup leading-relaxed">
        Akun dipakai supaya kemajuan belajarmu ikut pindah kalau kamu berganti HP.
        Setelah masuk sekali, aplikasi tetap bisa dipakai tanpa internet.
      </p>

      {tahap === "email" ? (
        <form className="mt-6 space-y-3" onSubmit={(ev) => { ev.preventDefault(); void kirim(); }}>
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
            spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@contoh.com" disabled={sibuk}
            className="w-full min-h-12 px-4 rounded-xl border border-garis text-base"
          />
          <Btn type="submit" disabled={sibuk}>{sibuk ? "Mengirim…" : "Kirim kode"}</Btn>
        </form>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={(ev) => { ev.preventDefault(); void verifikasi(); }}>
          <p className="text-sm leading-relaxed">
            Kode sudah dikirim ke <b className="break-all">{email.trim()}</b>. Buka emailnya dan ketik 6 angkanya di sini.
          </p>
          <label className="block text-sm font-medium" htmlFor="kode">Kode 6 angka</label>
          <input
            id="kode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7}
            value={kode} onChange={(e) => setKode(e.target.value)} placeholder="123456" disabled={sibuk}
            className="w-full min-h-12 px-4 rounded-xl border border-garis text-2xl tracking-widest text-center"
          />
          <Btn type="submit" disabled={sibuk}>{sibuk ? "Memeriksa…" : "Masuk"}</Btn>
          <Btn kind="ghost" type="button" disabled={sibuk}
            onClick={() => { setTahap("email"); setKode(""); setGalat(null); }}>
            Ganti email atau minta kode baru
          </Btn>
          <p className="text-xs text-redup leading-relaxed">
            Di email itu ada juga sebuah tautan. Kalau kamu memakai aplikasi yang sudah dipasang di layar utama,
            pakai kode di atas — menekan tautan akan membuka peramban, dan aplikasimu tetap tampak belum masuk.
          </p>
        </form>
      )}

      {galat && <p role="alert" className="mt-4 text-sm text-merah leading-relaxed">{galat}</p>}
    </div>
  );
}
