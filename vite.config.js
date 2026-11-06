import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  // Separar la planilla oficial del código de interfaz: los resultados cambian
  // con cada sincronización, pero los componentes mantienen su caché propia.
  // Por ahora es una dependencia síncrona: no alterar popups ni rankings.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]src[\\/]data[\\/]matchStats\\.js$/.test(id)) {
            return "match-stats";
          }
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
        navigateFallback: "/index.html",
        // Las navegaciones buscan primero la versión actual en la red.
        // Los recursos estáticos versionados siguen en precaché.
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
        ],
      },
    }),
  ],
});