import { defineConfig } from "vite";

export default defineConfig({
  base: "/web-sample",
  publicDir: "public",
  assetsInclude: ["**/*.wasm", "**/*.tar.gz"],
  optimizeDeps: {
    exclude: ["denoise-plugin"]
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  server: {
    fs: {
      allow: [".."]
    }
  }
});