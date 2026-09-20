import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { addDays, fmt } from "./engine/tanggal";
import type { ModeSesi } from "./types";
import { useAppData } from "./useAppData";
import { Beranda } from "./ui/Beranda";
import { Sesi } from "./ui/Sesi";
import { Tentang } from "./ui/Tentang";
import { Btn } from "./ui/komponen";

export default function App() {
  const { data, ubah, ambil, tersimpan } = useAppData();
  const [sesi, setSesi] = useState<{ mode: ModeSesi; nomor: number } | null>(null);
  const [tentang, setTentang] = useState(false);
  // tanggal lokal hari ini; diperbarui saat aplikasi kembali terlihat dan tiap menit, supaya
  // beranda yang dibiarkan terbuka melewati tengah malam tidak tetap memakai tanggal kemarin
  const [hari, setHari] = useState(() => fmt(new Date()));
  useEffect(() => {
    const cek = () => setHari(fmt(new Date()));
    const timer = window.setInterval(cek, 60_000);
    document.addEventListener("visibilitychange", cek);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", cek); };
  }, []);
  // versi baru diunduh di latar belakang; dipasang hanya atas permintaan murid, di luar sesi
  const { needRefresh: [adaVersiBaru], updateServiceWorker } = useRegisterSW();
  // vite-plugin-pwa hanya memuat ulang untuk pembaruan yang ditemukan saat halaman dibuka; kalau
  // aplikasi sudah lama terbuka, pembaruan dianggap "eksternal" dan tombol tampak tak berbuat apa-apa.
  const perbarui = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    void updateServiceWorker(true);
  };

  if (!data) return <div className="p-6 text-sm text-redup">Memuat…</div>;
  const t = addDays(hari, data.offset);

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      {!tersimpan && (
        <p role="alert" className="text-xs text-center py-2 px-4 bg-salah text-merah">
          Data tidak bisa disimpan di perangkat ini (mungkin jendela pribadi). Kemajuan hilang saat halaman ditutup.
        </p>
      )}
      {adaVersiBaru && !sesi && (
        <div role="status" className="max-w-md mx-auto px-5 pt-4 flex items-center gap-3">
          <p className="flex-1 text-sm">Versi baru aplikasi tersedia.</p>
          <Btn className="!w-auto !min-h-11 !py-2" onClick={perbarui}>Perbarui</Btn>
        </div>
      )}
      <main className="max-w-md mx-auto px-5 py-6">
        {sesi ? (
          <Sesi
            key={sesi.nomor} mode={sesi.mode} data={data} t={t} ubah={ubah} ambil={ambil}
            onKeluar={() => setSesi(null)}
          />
        ) : tentang ? (
          <Tentang onKembali={() => setTentang(false)} />
        ) : (
          <Beranda
            data={data} t={t} ubah={ubah} onMulai={(mode) => setSesi({ mode, nomor: Date.now() })}
            onTentang={() => setTentang(true)}
          />
        )}
      </main>
    </div>
  );
}
