// Efek suara (2026-11-13): dibuat langsung dengan Web Audio, tanpa berkas audio, jadi tidak
// menambah unduhan dan tetap jalan luring. Berbunyi otomatis dari sesi; murid bisa mematikannya.
// Suara tidak boleh menggagalkan sesi: semua kegagalan diabaikan.

let ctx: AudioContext | null = null;
let nyala = true;

export const aturSuara = (v: boolean): void => { nyala = v; };

/** [frekuensi Hz, mulai detik, lama detik] */
type Nada = [number, number, number];

function main(nada: Nada[], jenis: OscillatorType, keras = 0.2): void {
  if (!nyala) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const c = ctx;
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime + 0.02;
    for (const [f, mulai, lama] of nada) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = jenis;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + mulai);
      g.gain.exponentialRampToValueAtTime(keras, t + mulai + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + mulai + lama);
      o.connect(g);
      g.connect(c.destination);
      o.start(t + mulai);
      o.stop(t + mulai + lama + 0.03);
    }
  } catch { /* suara tidak kritis */ }
}

function getar(pola: number | number[]): void {
  if (!nyala) return;
  try { navigator.vibrate?.(pola); } catch { /* tidak kritis */ }
}

export const bunyi = {
  /** jawaban benar: "ting" */
  benar: (): void => main([[1318.5, 0, 0.12], [1760, 0.09, 0.28]], "sine"),
  /** jawaban salah: "tet-tot" */
  salah: (): void => { main([[233, 0, 0.2], [174.6, 0.2, 0.34]], "square", 0.12); getar(120); },
  /** kombo tiga atau lebih: "den-den" */
  kombo: (): void => main([[523.3, 0, 0.12], [659.3, 0, 0.12], [784, 0.14, 0.3], [1046.5, 0.14, 0.3]], "triangle"),
  /** kanji baru hafal atau sesi selesai dengan baik */
  naik: (): void => {
    main([[523.3, 0, 0.14], [659.3, 0.13, 0.14], [784, 0.26, 0.14], [1046.5, 0.39, 0.5], [784, 0.39, 0.5], [1318.5, 0.39, 0.5]], "triangle");
    getar([40, 60, 40]);
  },
};

// ——— Pengucapan kosakata (2026-11-13) ———
// Memakai mesin suara bawaan perangkat (Web Speech), jadi tanpa berkas audio dan tanpa server.
// Yang dibacakan adalah kana dari data, bukan tulisan kanjinya, supaya bacaannya pasti sama
// dengan yang diajarkan (mesin suara bisa memilih bacaan lain untuk kanji yang sama).

/** kana siap dibacakan: tanda ～ dan kurung dibuang (～にん → にん, たいせつ（な） → たいせつな) */
export const teksUcap = (kana: string): string => kana.replace(/[～（）]/g, "");

const suaraJepang = (): SpeechSynthesisVoice | undefined =>
  window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ja"));

/** false = perangkat tidak punya suara Jepang; undefined = daftar suara belum dimuat (dicoba saja) */
export function adaSuaraJepang(): boolean | undefined {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    if (window.speechSynthesis.getVoices().length === 0) return undefined;
    return !!suaraJepang();
  } catch { return false; }
}

/**
 * Bacakan satu kosakata. Pemanggilan otomatis mengikuti saklar suara; tombol pengeras suara
 * memakai `paksa` karena itu permintaan langsung murid.
 */
export function ucapkan(kana: string, opsi?: { paksa?: boolean }): void {
  if (!nyala && !opsi?.paksa) return;
  try {
    if (adaSuaraJepang() === false) return;
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(teksUcap(kana));
    u.lang = "ja-JP";
    u.rate = 0.9;
    const v = suaraJepang();
    if (v) u.voice = v;
    s.speak(u);
  } catch { /* suara tidak kritis */ }
}

export function hentikanUcapan(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* tidak kritis */ }
}
