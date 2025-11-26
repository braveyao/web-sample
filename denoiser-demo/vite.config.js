import { defineConfig } from 'vite';

export default defineConfig({
  base: '/web-sample/denoiser-demo/',
  build: {
    outDir: 'dist',
    target: 'es2015',
    rollupOptions: {
      input: 'main.js',
      output: {
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
