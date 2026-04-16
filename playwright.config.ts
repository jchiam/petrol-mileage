import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Load .env.local so PROXY_SECRET is available for the x-caddy-auth header.
// Next.js loads this automatically for the dev server; Playwright does not.
loadEnv({ path: '.env.local' });
loadEnv(); // fallback: .env

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'x-caddy-auth': process.env.PROXY_SECRET ?? '',
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI: build is run beforehand; `next start` is instant and avoids the
    // dev-mode cold-compilation timeout. Locally, dev server is preferred.
    command: process.env.CI ? 'npm start' : 'npm run dev',
    // Use port (TCP) not url (HTTP) — the middleware rejects requests without
    // x-caddy-auth, so an HTTP health check never returns 200 and times out.
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
