import { defineConfig } from "vite";

export default defineConfig({
  base: "/web-sample",
  publicDir: "public",
  assetsInclude: ["**/*.wasm", "**/*.tar.gz"],
  optimizeDeps: {
    exclude: ["denoise-plugin"]
  },
  build: {
    chunkSizeWarningLimit: 5000, // Increase warning threshold to 5MB
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          // Separate the denoise plugin into its own chunk
          'denoise': ['denoise-plugin'],
          // Separate the main SDK
          'ecprt-sdk': ['ecprt-client-sdk']
        }
      }
    },
  },
  server: {
    fs: {
      allow: [".."]
    }
  }
});