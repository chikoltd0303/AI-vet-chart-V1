import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

// Base URLs
const frontendBaseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Choose package manager command based on lockfiles or override by env
const webCommand = 'npm run dev';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-junit.xml' }],
  ],
  webServer: {
    command: webCommand,
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  // Run screenshots/videos/traces on failure for quick triage
  use: {
    baseURL: frontendBaseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ja-JP',
  },
  outputDir: 'playwright-artifacts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
