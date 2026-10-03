import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const p = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@company/tokens': p('packages/tokens/src/index.ts'),
      '@company/contracts': p('packages/contracts/src/index.ts'),
      '@company/company': p('packages/company/src/index.ts'),
      '@company/gateway': p('packages/gateway/src/index.ts'),
      '@company/api': p('services/api/src/app.ts'),
      '@company/orchestrator': p('services/orchestrator/src/index.ts'),
    },
  },
  test: {
    // The web app has its own runner (jsdom + React plugin): `npm test -w @company/web`.
    include: ['packages/**/test/**/*.test.ts', 'services/**/test/**/*.test.ts'],
    exclude: ['apps/**', '**/node_modules/**'],
    // PGlite (real PostgreSQL in WASM) is memory-hungry: one file at a time, one thread.
    // Slower, but the gate must be reliable on a small machine as well as a big one.
    // PGlite is real PostgreSQL compiled to WASM: three suites at once exhaust a small
    // machine. Each file gets its own short-lived process, so memory is released between
    // them — slower on a big machine, reliable everywhere.
    pool: 'forks',
    isolate: true,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
  },
});
