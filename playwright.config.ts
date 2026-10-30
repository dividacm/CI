import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Keep retries disabled during diagnosis so the first failure is visible.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  // CI logs should show each test as it runs; retain the HTML report locally.
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    // The E2E workflow builds explicitly before this step; avoid building twice.
    command: process.env.CI
      ? 'npm run preview -- --host 127.0.0.1'
      : 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
