import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// huruf nama aplikasi: hanya subset Latin (±20 KB), ikut disimpan untuk luring
import "@fontsource/reggae-one/latin-400.css";
import "./index.css";
import "./pasang"; // memasang pendengar beforeinstallprompt sedini mungkin
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
