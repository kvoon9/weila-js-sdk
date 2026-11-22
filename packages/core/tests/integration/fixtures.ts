import { test as base } from '@playwright/test'
import { CoreSession, CoreSessionOptions, readIntegrationEnv } from './harness'

export const integrationEnv = readIntegrationEnv()

/** Chromium flags that let the built SDK open a real recorder pipeline in headless tests: a synthetic microphone, auto-granted media permissions, and audio playback without a user gesture. */
const AUDIO_LAUNCH_ARGS = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
]

async function openCoreSession(options: CoreSessionOptions = {}) {
  if (!integrationEnv) throw new Error('Integration environment is not configured')

  const session = await CoreSession.open(integrationEnv, undefined, options)

  try {
    await session.login()
    await session.waitForReady()
    await session.waitForSessions()

    return session
  } catch (error) {
    await session.close()
    throw error
  }
}

/** Playwright test with a logged-in `core` session and an audio-enabled `coreAudio` variant. */
export const test = base.extend<{ core: CoreSession; coreAudio: CoreSession }>({
  core: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires this exact signature
    async ({}, use) => {
      const session = await openCoreSession()

      try {
        await use(session)
      } finally {
        await session.close()
      }
    },
    { scope: 'worker' },
  ],
  coreAudio: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires this exact signature
    async ({}, use) => {
      const session = await openCoreSession({ launchArgs: AUDIO_LAUNCH_ARGS })

      try {
        await use(session)
      } finally {
        await session.close()
      }
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
