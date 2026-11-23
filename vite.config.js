import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  // Separar la planilla oficial del código de interfaz: los resultados cambian
  // con cada sincronización, pero los componentes mantienen su caché propia.
  // Por ahora es una dependencia síncrona: no alterar popups ni rankings.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "match-stats",
              test: /[\\/]src[\\/]data[\\/]matchStats\.js$/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      // El registro se gestiona desde main.jsx para comprobar actualizaciones al reanudar.
      injectRegister: null,

      manifest: {
        id: "/",
        name: "La Naranja Argentina",
        short_name: "LNA",
        description: "El básquet argentino, en un solo lugar.",
        theme_color: "#101014",
        background_color: "#101014",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        // El historial completo de boxscores LAB puede superar el límite de precaché.
        // Se descarga bajo demanda al abrir funciones que necesitan estadísticas y luego
        // queda disponible en caché runtime, sin bloquear la instalación/actualización de la PWA.
        globIgnores: ["**/labBoxscores-*.js"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "lna-navigation-v1",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/assets\/labBoxscores-[^/]+\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "lna-lab-boxscores-v1",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 2, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
});