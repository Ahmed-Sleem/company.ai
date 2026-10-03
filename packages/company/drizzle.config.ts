import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/company/src/schema.ts',
  out: './packages/company/migrations',
  strict: true,
  verbose: false,
});
