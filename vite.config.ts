import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// Versi untuk log belajar (Tahap 1b): nomor versi package.json + cap waktu build UTC.
// Nomor versi saja tidak cukup — nomornya jarang dinaikkan, sedangkan yang perlu dijawab
// adalah "murid ini menjalankan build kapan?" (lihat src/versi.ts).
const VERSI = `${pkg.version}+${new Date().toISOString().slice(0, 16).replace("T", " ")}Z`;

export default defineConfig({
  define: { __VERSI__: JSON.stringify(VERSI) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": versi baru menunggu sampai murid menekan Perbarui, supaya sesi tidak terpotong reload mendadak
      registerType: "prompt",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Ngaji Kanji",
        short_name: "Ngaji Kanji",
        description: "Belajar kanji dengan arti bahasa Indonesia, mengikuti urutan IRODORI.",
        id: "/",
        lang: "id",
        start_url: "/",
        scope: "/",
        categories: ["education"],
        display: "standalone",
        orientation: "portrait",
        theme_color: "#151A3D",
        background_color: "#151A3D",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // data kanji (~1 MB) ikut di-precache supaya sesi jalan luring
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // service worker langsung mengendalikan halaman pertama, jadi kunjungan pertama pun sudah bisa dibuka luring
        clientsClaim: true,
      },
    }),
  ],
});
