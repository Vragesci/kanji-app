// Membuat ikon aplikasi (logo L3: 字 di lingkaran biru, huruf Noto Sans JP Bold, SIL OFL).
// Pemakaian (di folder dengan @fontsource/noto-sans-jp@5, opentype.js, @resvg/resvg-js): node ikon.mjs <folder keluaran>
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const keluar = process.argv[2];
mkdirSync(keluar, { recursive: true });
const font = opentype.parse(readFileSync("node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-109-700-normal.woff").buffer);
const BIRU = "#3346C2";

// jalur 字 dipusatkan di (cx, cy) dengan tinggi kotak glif = ukuran
function jalur(cx, cy, ukuran) {
  const p = font.getPath("字", 0, 0, ukuran);
  const b = p.getBoundingBox();
  const dx = cx - (b.x1 + b.x2) / 2, dy = cy - (b.y1 + b.y2) / 2;
  return font.getPath("字", dx, dy, ukuran).toPathData(2);
}
const svg = (isi, latar = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${latar}${isi}</svg>`;

// Ikon utama: latar putih penuh, lingkaran biru, 字 putih (aman untuk maskable: lingkaran r=184 < zona aman 205)
const penuh = svg(
  `<circle cx="256" cy="256" r="184" fill="${BIRU}"/><path d="${jalur(256, 256, 258)}" fill="#fff"/>`,
  `<rect width="512" height="512" fill="#fff"/>`,
);
// Favicon: lingkaran biru memenuhi kotak, latar transparan
const tab = svg(`<circle cx="256" cy="256" r="256" fill="${BIRU}"/><path d="${jalur(256, 256, 330)}" fill="#fff"/>`);

const png = (s, w) => new Resvg(s, { fitTo: { mode: "width", value: w } }).render().asPng();
writeFileSync(`${keluar}/icon-512.png`, png(penuh, 512));
writeFileSync(`${keluar}/icon-192.png`, png(penuh, 192));
writeFileSync(`${keluar}/icon-maskable-512.png`, png(penuh, 512));
writeFileSync(`${keluar}/apple-touch-icon.png`, png(penuh, 180));
writeFileSync(`${keluar}/favicon-32.png`, png(tab, 32));
writeFileSync(`${keluar}/logo.svg`, penuh);
writeFileSync(`${keluar}/favicon.svg`, tab);
console.log("ok");
