import { defineConfig } from '@playwright/test';
const port = Number(process.env.BOCHA_WEB_TEST_PORT ?? '3087');
if (!Number.isInteger(port) || port < 1024 || port > 65521)
  throw new Error('Puerto de prueba inválido.');
const scenarios = [
  { name: 'modules-control-tools', port: port, testMatch: '**/control-tools.spec.ts' },
  { name: 'modules-excel-export', port: port + 8, testMatch: '**/excel-export.spec.ts' },
  { name: 'modules-frontend-interactions', port: port + 9, testMatch: '**/frontend-interactions.spec.ts' },
  { name: 'modules-modules', port: port + 10, testMatch: '**/modules.spec.ts' },
  { name: 'modules-notifications', port: port + 11, testMatch: '**/notifications.spec.ts' },
  { name: 'modules-promotions', port: port + 12, testMatch: '**/promotions.spec.ts' },
  { name: 'modules-purchases', port: port + 13, testMatch: '**/purchases.spec.ts' },
  { name: 'dashboard', port: port + 1, testMatch: '**/dashboard-navigation.spec.ts' },
  { name: 'store-day', port: port + 2, testMatch: '**/store-day.spec.ts' },
  { name: 'backup-recovery', port: port + 3, testMatch: '**/backup-recovery.spec.ts' },
  { name: 'scanner', port: port + 4, testMatch: '**/scanner-circuit.spec.ts' },
  { name: 'security', port: port + 5, testMatch: '**/security-circuit.spec.ts' },
  { name: 'customer-credit', port: port + 6, testMatch: '**/customer-credit-circuit.spec.ts' },
  { name: 'qa-edge', port: port + 7, testMatch: '**/qa-edge-circuits.spec.ts' },
];
export default defineConfig({
  testDir: './tests/web-e2e',
  workers: 1,
  fullyParallel: false,
  use: { trace: 'retain-on-failure' },
  projects: scenarios.map(({ name, port: scenarioPort, ...selection }) => ({
    name,
    ...selection,
    use: { baseURL: `http://localhost:${scenarioPort}` },
  })),
  // Money, permissions and login rate limits must not leak across new scenarios.
  webServer: scenarios.map(({ port: scenarioPort }) => ({
    command: 'node scripts/web-test-server.mjs',
    env: { BOCHA_WEB_TEST_PORT: String(scenarioPort) },
    url: `http://localhost:${scenarioPort}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 30000,
  })),
});
