import { Btn, Jp, NamaAplikasi } from "./komponen";
import { PanduanPasang } from "./PetunjukPasang";

const CC = "https://creativecommons.org/licenses/by-sa/4.0/";
const EDRDG = "https://www.edrdg.org/";

function Tautan({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-aksen">{children}</a>;
}

export function Tentang({ onKembali }: { onKembali: () => void }) {
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
