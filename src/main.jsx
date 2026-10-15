import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import App from "./App.jsx";

// Detectar actualizaciones de la PWA
const updateSW = registerSW({
  immediate: true,

  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    // Buscar nuevas versiones cada 5 minutos
    setInterval(() => {
      if (navigator.onLine) {
        registration.update().catch((error) => {
          console.warn("LNA: error al buscar actualizaciones", error);
        });
      }
    }, 5 * 60 * 1000);
  },

  onNeedRefresh() {
    console.log("LNA: nueva versión disponible");
    updateSW(true);
  },

  onOfflineReady() {
    console.log("LNA: disponible sin conexión");
  },
});