import { defineConfig } from 'vite';

export default defineConfig({
  base: '/web-sample/denoiser-demo/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
