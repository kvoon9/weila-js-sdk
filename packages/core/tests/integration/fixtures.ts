import { test as base } from '@playwright/test'
import { CoreSession, readIntegrationEnv } from './harness'

export const integrationEnv = readIntegrationEnv()

export const test = base.extend<{ core: CoreSession }>({
  core: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires this exact signature
    async ({}, use) => {
      if (!integrationEnv) throw new Error('Integration environment is not configured')

      const session = await CoreSession.open(integrationEnv)

      try {
        await session.login()
        await session.waitForReady()
        await session.waitForSessions()
        await use(session)
      } finally {
        await session.close()
      }
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
