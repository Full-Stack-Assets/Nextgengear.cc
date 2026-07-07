import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Test runner config. Mirrors the `@/*` and `@/content/*` path aliases from
 * tsconfig.json so tests import modules exactly like the app does. Tests live
 * next to the code they cover in `__tests__/` folders and run in the Node
 * environment (the pipeline is server-side; no DOM needed).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@/content': fileURLToPath(new URL('./content', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/__tests__/**'],
    },
  },
});
