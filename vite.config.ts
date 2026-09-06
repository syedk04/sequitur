import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("./src/web", import.meta.url));

export default defineConfig({
  root: webRoot,
  base: process.env.GITHUB_PAGES ? "/sequitur/" : "/",
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
