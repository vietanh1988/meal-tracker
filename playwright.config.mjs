// E2E: chạy app bản build (vite preview) trỏ vào Supabase LOCAL.
// Biến môi trường do CI đặt: E2E_SUPABASE_URL, E2E_SERVICE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.mjs/,
  globalSetup: "./tests/e2e/global-setup.mjs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, testMatch: /mobile\..*\.spec\.mjs/ },
    { name: "pc", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } }, testMatch: /pc\..*\.spec\.mjs/ },
  ],
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
