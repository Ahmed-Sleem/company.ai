import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The app is client-only (REQ-13): the data lives in the visitor's own save, so there is no
 * API to proxy and nothing to boot beside the static bundle. `base: './'` keeps every asset
 * URL relative, so the built app works from any path — the Pages root today, a folder on a
 * disk tomorrow — without a rebuild.
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: { outDir: 'dist', sourcemap: true },
});
