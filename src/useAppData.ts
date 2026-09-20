import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "./types";
import { KOSONG, mintaPenyimpananTetap, muat, simpan } from "./db/penyimpanan";

/**
 * Data murid: dimuat dari IndexedDB sekali, lalu setiap perubahan ditulis balik
 * (hanya kanji yang berubah). `ubah` memakai fungsi atas data terbaru sehingga dua
 * perubahan beruntun tidak saling menimpa. Kalau IndexedDB tidak bisa dipakai
 * (mis. jendela pribadi), aplikasi tetap jalan di memori dan `tersimpan` = false.
 *
 * `tertulis` = data terakhir yang benar-benar sudah masuk IndexedDB. Selisih yang
 * ditulis selalu dihitung dari `tertulis`, bukan dari state sebelumnya di memori,
 * jadi satu penulisan yang gagal ikut dicoba lagi pada penulisan berikutnya.
 */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [tersimpan, setTersimpan] = useState(true);
  const ref = useRef<AppData>(KOSONG);
  const tertulis = useRef<AppData>(KOSONG);
  const antre = useRef<Promise<void>>(Promise.resolve());
  const menunggu = useRef(0);
  const versi = useRef(0);
  const dimuat = useRef(false);

  useEffect(() => {
    let batal = false;
    muat()
      .catch((e) => { console.error("Gagal memuat data", e); setTersimpan(false); return KOSONG; })
      .then((d) => { if (batal) return; ref.current = d; tertulis.current = d; dimuat.current = true; setData(d); });
    void mintaPenyimpananTetap();
    return () => { batal = true; };
  }, []);

  // Tab lain (atau aplikasi terpasang di samping tab browser) bisa mengubah data yang sama.
  // Saat tab ini kembali terlihat dan tidak ada perubahan yang belum tertulis, muat ulang dari IndexedDB.
  useEffect(() => {
    const segarkan = () => {
      if (document.visibilityState !== "visible" || !dimuat.current) return;
      if (menunggu.current > 0 || ref.current !== tertulis.current) return;
      const v = versi.current;
      muat()
        .then((d) => {
          if (versi.current !== v || menunggu.current > 0 || ref.current !== tertulis.current) return;
          ref.current = d; tertulis.current = d; setData(d);
        })
        .catch(() => { /* biarkan data di memori */ });
    };
    document.addEventListener("visibilitychange", segarkan);
    return () => document.removeEventListener("visibilitychange", segarkan);
  }, []);

  const ubah = useCallback((fn: (d: AppData) => AppData) => {
    const lama = ref.current;
    const baru = fn(lama);
    if (baru === lama) return;
    ref.current = baru;
    versi.current++;
    setData(baru);
    menunggu.current++;
    antre.current = antre.current.then(async () => {
      const target = ref.current;
      try {
        await simpan(tertulis.current, target);
        tertulis.current = target;
        setTersimpan(true);
      } catch (e) {
        console.error("Gagal menyimpan", e);
        setTersimpan(false);
      } finally {
        menunggu.current--;
      }
    });
  }, []);

  const ambil = useCallback(() => ref.current, []);

  return { data, ubah, ambil, tersimpan };
}
