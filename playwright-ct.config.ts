import { defineConfig, devices } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";

export default defineConfig({
  testDir: "./tests/components",
  timeout: 15000,
  use: {
    ...devices["Desktop Chrome"],
    ctPort: 3100,
    ctViteConfig: {
      plugins: [react()],
    },
  },
});
