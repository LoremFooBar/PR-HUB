import { defineConfig } from "vite";
import { resolve } from "path";

// Separate build: a declarative content script can't be an ES module, so it must
// be a single self-contained IIFE — it can't share chunks with the popup build.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content.ts"),
      formats: ["iife"],
      name: "PRHubPreview",
      fileName: () => "content.js",
    },
  },
});
