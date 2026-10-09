import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.test.tsx'],
    globals: false,
    css: false,
  },
  resolve: {
    alias: {
      '@company/contracts': new URL('../../packages/contracts/src/index.ts', import.meta.url).pathname,
      '@company/tokens': new URL('../../packages/tokens/src/index.ts', import.meta.url).pathname,
    },
  },
});
