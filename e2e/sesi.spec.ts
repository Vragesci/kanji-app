/**
 * Memainkan satu sesi penuh seperti murid, di lebar 390 px, lalu memeriksa tiap soal.
 * Yang diperiksa bukan tampilannya, melainkan apakah soalnya masih bisa dikerjakan:
 * empat pilihan, tidak ada pilihan yang rusak bentuknya, tidak ada pilihan kembar,
 * dan sesi benar-benar sampai ke layar おつかれさま.
 */
import { expect, test, type Page } from "@playwright/test";

const bersihkanData = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase("kanji-app");
      r.onsuccess = r.onerror = r.onblocked = () => res();
    }),
  );

/** mulai dari data kosong pada tingkat tertentu */
async function mulai(page: Page, tingkat: "N5" | "N4" | "N3" | "N2" | "N1") {
  await page.goto("/");
  await bersihkanData(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: `sampai ${tingkat}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `sampai ${tingkat}`, exact: true }).click();
  await page.getByRole("button", { name: /Lanjutkan belajar|Mulai belajar/ }).first().click();
}

interface Soal {
  jenis: "arti" | "bacaan" | "rakit";
  kata: string;
  pilihan: string[];
}

/** baca soal yang sedang tampil tanpa menjawabnya */
async function bacaSoal(page: Page): Promise<Soal> {
  const prompt = (await page.locator("p.text-sm.text-redup").first().innerText()).trim();
  const jenis = prompt.includes("arti") ? "arti" : prompt.includes("cara baca") ? "bacaan" : "rakit";
  if (jenis === "rakit") {
    const pilihan = (await page.locator("div.grid.grid-cols-3 > button").allInnerTexts()).map((s) => s.trim());
    return { jenis, kata: (await page.locator("p.text-3xl.font-bold").first().innerText()).trim(), pilihan };
  }
  const kata = (await page.locator("p.text-6xl").first().innerText()).trim();
  const pilihan = (await page.locator("div.space-y-2 > button").allInnerTexts()).map((s) => s.trim());
  return { jenis, kata, pilihan };
}

/** cacat bentuk yang pernah lolos ke murid: kurung ganda (げんき（（な）), kana yang tak berdiri sendiri */
function periksaBentuk(s: Soal) {
  for (const p of s.pilihan) {
    expect(p.length, `${s.kata}: ada pilihan kosong`).toBeGreaterThan(0);
    const buka = (p.match(/（/g) ?? []).length;
    const tutup = (p.match(/）/g) ?? []).length;
    expect(buka, `${s.kata}: pilihan "${p}" punya tanda kurung tidak berpasangan`).toBe(tutup);
    expect(buka, `${s.kata}: pilihan "${p}" punya tanda kurung ganda`).toBeLessThanOrEqual(1);
    if (buka === 1) expect(p.endsWith("（な）"), `${s.kata}: kurung di tengah pilihan "${p}"`).toBe(true);
    if (s.jenis === "bacaan") {
      expect(/^[ゃゅょっんー]/.test(p), `${s.kata}: pilihan "${p}" diawali huruf yang tidak pernah berdiri sendiri`).toBe(false);
      expect(/っ$/.test(p), `${s.kata}: pilihan "${p}" diakhiri っ`).toBe(false);
    }
  }
  const unik = new Set(s.pilihan.map((p) => p.toLowerCase().replace(/\s+/g, "")));
  expect(unik.size, `${s.kata}: ada pilihan kembar — ${s.pilihan.join(" / ")}`).toBe(s.pilihan.length);
}

/** mainkan sesi sampai habis; kembalikan semua soal yang dilewati */
async function mainkanSampaiSelesai(page: Page): Promise<Soal[]> {
  const soal: Soal[] = [];
  for (let i = 0; i < 40; i++) {
    if (await page.getByText("おつかれさま").isVisible().catch(() => false)) break;
    const s = await bacaSoal(page);
    soal.push(s);

    if (s.jenis === "rakit") {
      expect(s.pilihan.length, `${s.kata}: soal rakit harus 6 pilihan`).toBe(6);
      periksaBentuk(s);
      // isi semua kotak kosong
      for (let k = 0; k < 6; k++) {
        const grid = page.locator("div.grid.grid-cols-3 > button");
        if (!(await grid.count())) break;
        await grid.first().click();
      }
    } else {
      expect(s.pilihan.length, `${s.kata}: soal pilihan ganda harus 4 pilihan`).toBe(4);
      periksaBentuk(s);
      await page.locator("div.space-y-2 > button").first().click();
    }

    const lanjut = page.getByRole("button", { name: "Lanjut" });
    await expect(lanjut).toBeVisible();
    await lanjut.click();
  }
  return soal;
}

for (const tingkat of ["N5", "N3"] as const) {
  test(`sesi penuh di ${tingkat} sampai layar selesai`, async ({ page }) => {
    const galat: string[] = [];
    page.on("pageerror", (e) => galat.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") galat.push(m.text()); });

    await mulai(page, tingkat);
    const soal = await mainkanSampaiSelesai(page);

    expect(soal.length, "sesi harus berisi 10 soal").toBe(10);
    await expect(page.getByText("おつかれさま")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kembali ke beranda" })).toBeVisible();
    expect(galat, "tidak boleh ada galat JavaScript selama sesi").toEqual([]);
  });
}

test("tombol \"Sudah tahu kanji ini\" melewati soal dan menandai kanji hafal", async ({ page }) => {
  await mulai(page, "N5");
  await bacaSoal(page);
  const lewati = page.getByRole("button", { name: "Sudah tahu kanji ini — lewati" });
  await expect(lewati).toBeVisible();
  await lewati.click();
  // soal berikutnya langsung tampil, tanpa layar hasil
  await expect(page.getByRole("button", { name: "Lanjut" })).toBeHidden();
  const ks = await page.evaluate(
    () => new Promise<number>((res) => {
      const r = indexedDB.open("kanji-app", 1);
      r.onsuccess = () => {
        const tx = r.result.transaction("kanji", "readonly");
        const semua = tx.objectStore("kanji").getAll();
        tx.oncomplete = () => res(semua.result.filter((s: { green?: boolean }) => s.green).length);
      };
      r.onerror = () => res(-1);
    }),
  );
  expect(ks, "satu kanji harus langsung jadi hijau").toBeGreaterThanOrEqual(1);
});
