import { useState, type ReactNode } from "react";

/** Daftar pilihan ganda. `benar` dibandingkan dengan identitas (===), bukan isi. */
export function Pilihan<T>({ opsi, benar, hasil, onPilih, tampil }: {
  opsi: T[];
  benar: T;
  hasil: boolean | null;
  onPilih: (benar: boolean) => void;
  tampil: (o: T) => ReactNode;
}) {
  const [dipilih, setDipilih] = useState<T | null>(null);
  return (
    <div className="space-y-2 mt-6">
      {opsi.map((o, i) => {
        let gaya = "border-garis bg-white";
        if (hasil !== null) {
          if (o === benar) gaya = "border-hijau bg-benar";
          else if (o === dipilih) gaya = "border-merah bg-salah";
        }
        return (
          <button
            key={i}
            type="button"
            disabled={hasil !== null}
            onClick={() => { if (hasil === null) { setDipilih(o); onPilih(o === benar); } }}
            className={`w-full min-h-12 py-3 px-4 rounded-xl text-left border-2 text-tinta disabled:text-tinta ${gaya}`}
          >
            {tampil(o)}
          </button>
        );
      })}
    </div>
  );
}
