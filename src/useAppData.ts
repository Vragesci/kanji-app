import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "./types";
import { KOSONG, mintaPenyimpananTetap, muat, simpan } from "./db/penyimpanan";

/**
 * Data murid: dimuat dari IndexedDB sekali, lalu setiap perubahan ditulis balik
 * (hanya kanji yang berubah). `ubah` memakai fungsi atas data terbaru sehingga dua
 * perubahan beruntun tidak saling menimpa. Kalau IndexedDB tidak bisa dipakai
 * (mis. jendela pribadi), aplikasi tetap jalan di memori dan `tersimpan` = false.
 */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [tersimpan, setTersimpan] = useState(true);
  const ref = useRef<AppData>(KOSONG);
  const antre = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let batal = false;
    muat()
      .catch((e) => { console.error("Gagal memuat data", e); setTersimpan(false); return KOSONG; })
      .then((d) => { if (batal) return; ref.current = d; setData(d); });
    void mintaPenyimpananTetap();
    return () => { batal = true; };
  }, []);

  const ubah = useCallback((fn: (d: AppData) => AppData) => {
    const lama = ref.current;
    const baru = fn(lama);
    if (baru === lama) return;
    ref.current = baru;
    setData(baru);
    antre.current = antre.current
      .then(() => simpan(lama, baru))
      .catch((e) => { console.error("Gagal menyimpan", e); setTersimpan(false); });
  }, []);

  const ambil = useCallback(() => ref.current, []);

  return { data, ubah, ambil, tersimpan };
}
