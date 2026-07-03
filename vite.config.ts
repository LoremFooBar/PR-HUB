import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-manifest-and-icons",
      closeBundle() {
        copyFileSync("manifest.json", "dist/manifest.json");
        mkdirSync("dist/icons", { recursive: true });
        for (const file of readdirSync("icons")) {
          if (file.endsWith(".png")) {
            copyFileSync(`icons/${file}`, `dist/icons/${file}`);
          }
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        // Emit the service worker at a stable path the manifest can reference.
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
