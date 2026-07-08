import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mirror the tsconfig path aliases so tests import modules the same way the app
// does (`@/lib/...`). Kept manual (rather than a tsconfig-paths plugin) to avoid
// an extra dependency for two aliases.
const src = fileURLToPath(new URL('./src', import.meta.url));
const content = fileURLToPath(new URL('./content', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/content\//, replacement: `${content}/` },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
});
