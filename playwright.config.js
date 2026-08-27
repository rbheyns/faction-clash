// @ts-check
const fs = require('fs');
const { defineConfig, devices } = require('@playwright/test');

// index.html is a self-contained, no-build-step file — tests open it directly
// via file:// (the same way a player double-clicking the file would), which
// also exercises the embedded-JSON fallback path in js/dataLoader.js since
// fetch() of local files is blocked under file://. No dev server needed.
//
// First-time setup on a new machine: `npm install`, then
// `npx playwright install chromium` once to download a browser Playwright
// controls. Some CI/sandbox environments (e.g. the one these tests were
// authored in) instead pre-install a browser at a fixed path and set
// PLAYWRIGHT_BROWSERS_PATH — if a pinned @playwright/test version doesn't
// match what's there, point straight at the known-good executable instead of
// trying to download a new one. Everywhere else (including a normal
// developer machine on Windows/Mac/Linux) this path just won't exist and
// Playwright manages its own browser as usual.
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium';
const launchOptions = fs.existsSync(PINNED_CHROMIUM) ? { executablePath: PINNED_CHROMIUM } : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
});
