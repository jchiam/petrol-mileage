import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

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
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
