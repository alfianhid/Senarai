import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Serial file execution keeps runs deterministic in sandboxed or
    // file-synced workspaces, where parallel temp writes can race. The suite
    // takes about three seconds either way.
    fileParallelism: false,
  },
});
