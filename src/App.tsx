import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { addDays, fmt } from "./engine/tanggal";
import type { ModeSesi } from "./types";
import { useAppData } from "./useAppData";
import { useAkun } from "./sinkron/useAkun";
import { useSetuju } from "./sinkron/useSetuju";
import { useSinkron } from "./sinkron/useSinkron";
import { Beranda } from "./ui/Beranda";
import { Masuk } from "./ui/Masuk";
import { Persetujuan } from "./ui/Persetujuan";
import { Sesi } from "./ui/Sesi";
import { Tentang } from "./ui/Tentang";
import { Btn } from "./ui/komponen";

export default function App() {
  const { data, ubah, ganti, tersimpan } = useAppData();
  const akun = useAkun();
  const setuju = useSetuju(akun.akun?.id ?? null);
  const sinkron = useSinkron({
    userId: akun.akun?.id ?? null,
    setuju: setuju.setuju === "setuju",
    data,
    ganti,
  });
  const [sesi, setSesi] = useState<{ mode: ModeSesi; nomor: number; pilihan?: string[] } | null>(null);
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
  const [memperbarui, setMemperbarui] = useState(false);
  const perbarui = () => {
    setMemperbarui(true);
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    void updateServiceWorker(true);
    // Cadangan kalau tombol tampak tak berbuat apa-apa (mis. iOS): kirim perintah ke versi yang menunggu;
    // kalau tidak ada yang menunggu, versi baru sudah terpasang sehingga cukup muat ulang.
    window.setTimeout(() => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          window.setTimeout(() => window.location.reload(), 2000);
        } else {
          window.location.reload();
        }
      });
    }, 2000);
  };

  if (akun.status === "memuat") return <div className="p-6 text-sm text-redup">Memuat…</div>;

  // Wajib masuk, tapi hanya sekali dan hanya saat daring: `bolehBelajar` tetap
  // true untuk murid yang pernah masuk di perangkat ini walau sesinya tidak
  // bisa dipastikan sekarang, supaya sesi di kereta tanpa sinyal tidak terhenti.
  if (!akun.bolehBelajar) {
    return (
      <main className="min-h-dvh max-w-md mx-auto px-5 py-8 pb-[env(safe-area-inset-bottom)]">
        <Masuk kirimKode={akun.kirimKode} verifikasiKode={akun.verifikasiKode} />
      </main>
    );
  }

  if (setuju.setuju === "belum" && akun.akun) {
    return (
      <main className="min-h-dvh max-w-md mx-auto px-5 py-8 pb-[env(safe-area-inset-bottom)]">
        <Persetujuan
          email={akun.akun.email} sibuk={setuju.sibuk}
          onSetuju={() => void setuju.terima()} onTolak={setuju.tolak}
        />
      </main>
    );
  }

  if (!data) return <div className="p-6 text-sm text-redup">Memuat…</div>;
  const t = addDays(hari, data.offset);

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      {!tersimpan && (
        <p role="alert" className="text-xs text-center py-2 px-4 bg-salah text-merah">
          Data tidak bisa disimpan di perangkat ini (mungkin jendela pribadi). Kemajuan hilang saat halaman ditutup.
        </p>
      )}
      {sinkron.status === "gagal" && (
        <p role="alert" className="text-xs text-center py-2 px-4 bg-salah text-merah">
          Kemajuanmu tersimpan di HP ini, tapi belum sampai ke server. Buka halaman Tentang untuk mencoba lagi.
        </p>
      )}
      {adaVersiBaru && !sesi && (
        <div role="status" className="max-w-md mx-auto px-5 pt-4 flex items-center gap-3">
          <p className="flex-1 text-sm">Versi baru aplikasi tersedia.</p>
          <Btn className="!w-auto !min-h-11 !py-2" onClick={perbarui} disabled={memperbarui}>{memperbarui ? "Memperbarui…" : "Perbarui"}</Btn>
        </div>
      )}
      <main className="max-w-md mx-auto px-5 py-6">
        {sesi ? (
          <Sesi
            key={sesi.nomor} mode={sesi.mode} pilihan={sesi.pilihan} data={data} t={t} ubah={ubah}
            onKeluar={() => setSesi(null)}
          />
        ) : tentang ? (
          <Tentang
            onKembali={() => setTentang(false)}
            email={akun.akun?.email ?? null}
            luring={akun.status === "luring"}
            statusSinkron={sinkron.status}
            pesanSinkron={sinkron.pesan}
            setuju={setuju.setuju}
            onSetuju={() => void setuju.terima()}
            onTolakSinkron={setuju.tolak}
            onSinkronkan={() => void sinkron.sinkronkanSekarang()}
            onKeluar={() => void akun.keluarAkun()}
          />
        ) : (
          <Beranda
            data={data} t={t} ubah={ubah} onMulai={(mode, pilihan) => setSesi({ mode, nomor: Date.now(), pilihan })}
            onTentang={() => setTentang(true)}
          />
        )}
      </main>
    </div>
  );
}
