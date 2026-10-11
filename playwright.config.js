import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5174', launchOptions: { executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM ? undefined : (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium'), args: ['--no-sandbox'] } },
  webServer: { command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
  workers: 1,
})
