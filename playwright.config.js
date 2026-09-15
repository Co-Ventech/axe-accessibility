const { defineConfig, devices } = require('@playwright/test');
const { uiBaseUrl, headless, timeoutMs } = require('./src/config');

const isCi = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 1,
  timeout: timeoutMs,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: uiBaseUrl,
    headless,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
