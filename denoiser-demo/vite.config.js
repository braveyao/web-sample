import { defineConfig } from 'vite';

export default defineConfig({
  base: '/web-sample/denoiser-demo/',
  build: {
    outDir: 'dist',
    target: 'es2015',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        format: 'es'
      }
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
