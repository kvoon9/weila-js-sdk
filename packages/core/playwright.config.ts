import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: ['integration/**'],
  timeout: 30_000,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    headless: true,
  },
})
