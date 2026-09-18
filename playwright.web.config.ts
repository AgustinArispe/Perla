import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web-e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3087', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/web-test-server.mjs',
    url: 'http://localhost:3087/api/v1/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
