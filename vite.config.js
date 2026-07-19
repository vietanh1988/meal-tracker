import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Fipilot AI - AI Nutrition Coach",
        short_name: "Fipilot AI",
        description: "Theo dõi dinh dưỡng thông minh với AI",
        theme_color: "#007AFF",
        background_color: "#F8FAFC",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.png?v=3", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png?v=3", sizes: "512x512", type: "image/png" }
        ]
      },
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST"
      }
    })
  ]
});
