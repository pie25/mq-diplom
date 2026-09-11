import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built app can be served from any sub-path
// (GitHub Pages, a folder on a static host, or the file system).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2019" },
  test: { environment: "node" },
});
