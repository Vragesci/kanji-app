import { defineConfig, devices } from "@playwright/test";

/**
 * Tes e2e memainkan satu sesi penuh di tampilan HP. Tujuannya menangkap soal yang rusak
 * sebelum sampai ke murid — bukan menguji tampilan.
 *
 * Lebar 390 px dipilih karena itu lebar HP yang dipakai murid; brief proyek menyebut
 * mobile-first dan Android kelas menengah.
 */
export default defineConfig({
  testDir: "./e2e",
  // tiap berkas tes memulai dari IndexedDB yang bersih, jadi tidak boleh paralel di satu peramban
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "hp", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
