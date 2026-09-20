import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./pasang"; // memasang pendengar beforeinstallprompt sedini mungkin
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
