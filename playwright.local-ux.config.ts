import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/web-e2e',
  testMatch: [
    'customer-credit-circuit.spec.ts',
    'purchases.spec.ts',
    'excel-export.spec.ts',
    'control-tools.spec.ts',
  ],
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://localhost:3197', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/web-test-server.mjs',
    env: { BOCHA_WEB_TEST_PORT: '3197' },
    url: 'http://localhost:3197/api/v1/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
