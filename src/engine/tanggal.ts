// Tanggal dihitung sebagai "YYYY-MM-DD" waktu lokal, bukan UTC, supaya hari
// ganti tengah malam di tempat murid (WIB, WITA, JST), bukan tengah malam UTC.
export const fmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parse = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number): string => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export const diff = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const hariIni = (offset: number): string => addDays(fmt(new Date()), offset);
