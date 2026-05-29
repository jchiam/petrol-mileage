import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Load .env.local so PROXY_SECRET is available for the x-caddy-auth header.
// Next.js loads this automatically for the dev server; Playwright does not.
loadEnv({ path: '.env.local' });
loadEnv(); // fallback: .env

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'x-caddy-auth': process.env.PROXY_SECRET ?? '',
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Always run against a production build — eliminates Next.js dev-mode
    // HMR thrash that caused chronic e2e flake. `npm run build` is the
    // responsibility of the caller (see `test:e2e` script).
    command: 'npm start',
    // Use port (TCP) not url (HTTP) — middleware rejects unauthenticated
    // requests so an HTTP health check times out.
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Activates src/lib/test-mocks.ts cookie reader. Never set in production.
      E2E_MOCKS: '1',
    },
  },
});
