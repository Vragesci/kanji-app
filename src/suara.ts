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
