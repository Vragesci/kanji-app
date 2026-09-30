import { Btn } from "./komponen";

/**
 * Ditampilkan sekali, sesudah masuk dan sebelum satu byte pun dikirim ke server.
 *
 * Menolak bukan jalan buntu: aplikasi tetap jalan penuh, datanya tinggal di
 * perangkat seperti sebelum ada akun. Yang hilang hanya kemampuan berpindah HP.
 */
export function Persetujuan({
  email, onSetuju, onTolak, sibuk,
}: {
  email: string;
  onSetuju: () => void;
  onTolak: () => void;
  sibuk?: boolean;
}) {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Simpan kemajuan di server?</h1>

      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>
          Supaya kemajuan belajarmu ikut pindah kalau kamu berganti HP, datanya perlu disimpan
          di server, bukan hanya di HP ini.
        </p>

        <section>
          <h2 className="font-bold">Yang disimpan</h2>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>kanji yang sudah kamu pelajari, berapa kali benar dan salah, serta jadwal ulangnya</li>
            <li>riwayat sesi: tanggal, jumlah soal, dan ketepatan jawaban</li>
            <li>tingkat yang kamu pilih dan tanggal ujian JLPT yang kamu tuju</li>
            <li>alamat emailmu, <span className="text-redup">{email}</span>, sebagai penanda akun</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold">Yang tidak disimpan</h2>
          <p className="mt-1">
            Tidak ada nama, umur, nomor HP, atau lokasi. Aplikasi tidak pernah menanyakannya.
          </p>
        </section>

        <section>
          <h2 className="font-bold">Siapa yang bisa membacanya</h2>
          <p className="mt-1">
            Hanya kamu. Murid lain tidak bisa melihat datamu, dan pengajar tidak punya halaman
            untuk memantau kemajuan murid.
          </p>
        </section>

        <section>
          <h2 className="font-bold">Kalau kamu menolak</h2>
          <p className="mt-1">
            Aplikasi tetap bisa dipakai seperti biasa dan datamu tinggal di HP ini saja.
            Yang tidak bisa cuma satu: kemajuanmu tidak ikut pindah kalau kamu berganti HP.
            Kamu boleh mengubah pilihan ini kapan saja di halaman Tentang.
          </p>
        </section>

        <p className="text-redup">
          Kamu bisa menghapus akun beserta seluruh datanya kapan saja dari halaman Tentang.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Btn onClick={onSetuju} disabled={sibuk}>{sibuk ? "Menyimpan…" : "Setuju, simpan di server"}</Btn>
        <Btn kind="ghost" onClick={onTolak} disabled={sibuk}>Tidak, simpan di HP ini saja</Btn>
      </div>
    </div>
  );
}
