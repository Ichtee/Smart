/**
 * Real-browser tests.
 *
 * HOW TO RUN (from this folder):
 *   1. npm install                 (once; needs the backend/ and frontend/ dependencies installed too)
 *   2. npm test                    (or: npx playwright test tests/login.spec.ts, npm run test:headed, ...)
 *   3. npm run report              (HTML report with traces/screenshots of failures)
 *
 * It uses the Google Chrome installed on the machine (channel 'chrome'), so no browser download is needed.
 * If Chrome is missing, run `npx playwright install chromium` and change `channel` below to undefined.
 *
 * What gets started automatically (and stopped afterwards):
 *   - harness/backend.js on :5099 — the real Express app on an in-memory MongoDB, EmailJS intercepted
 *     (emails are read back through GET /__e2e/emails). It can never reach a real database.
 *   - `next dev` on :3100, pointed at that backend.
 * Both ports must be free: the servers are deliberately NOT reused, so a stray dev server wired to a real
 * database can never be tested against by accident.
 *
 * Conventions: every test creates its own uniquely named users (support.ts), so tests do not depend on each
 * other or on order; a single worker keeps the dev server and the shared in-memory database calm.
 */
import { defineConfig } from '@playwright/test';

const API_PORT = 5099;
const WEB_PORT = 3100;
export const API = `http://localhost:${API_PORT}`;
export const BASE = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: 'vi-VN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `node harness/backend.js ../backend ${API_PORT} ${BASE}`,
      url: `${API}/__e2e/emails`,
      reuseExistingServer: false,
      timeout: 120_000, // the first run may download a MongoDB binary
      stdout: 'pipe',
    },
    {
      command: `npm run dev -- -p ${WEB_PORT}`,
      cwd: '../frontend',
      env: { NEXT_PUBLIC_API_URL: API },
      url: `${BASE}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
