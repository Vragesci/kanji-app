import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": versi baru menunggu sampai murid menekan Perbarui, supaya sesi tidak terpotong reload mendadak
      registerType: "prompt",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Aplikasi Kanji",
        short_name: "Kanji",
        description: "Belajar kanji dengan arti bahasa Indonesia, mengikuti urutan IRODORI.",
        id: "/",
        lang: "id",
        start_url: "/",
        scope: "/",
        categories: ["education"],
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1F4E79",
        background_color: "#F5F7F9",
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
