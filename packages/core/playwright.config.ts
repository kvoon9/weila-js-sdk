import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    headless: true,
  },
})
