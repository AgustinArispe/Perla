import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // SQLite Node-API bindings are shared by Node tests and Electron workers.
    pool: 'threads',
  },
});
