import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The dev server proxies /api to the API service, so the browser only ever talks to one
 * origin (and the live preview works without exposing a second port to the user).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
