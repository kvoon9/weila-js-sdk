import { expect, integrationEnv, test } from './fixtures'
import { pickSession } from './harness'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

const SENT_STATUS = 1
const AUDIO_MESSAGE_TYPE = 1

test('sends a text message and stores it as sent', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)
  const text = `[sdk-int] text ${Date.now()}`

  await expect(core.sendText(session.sessionId, session.sessionType, text)).resolves.toBe(true)

  await expect
    .poll(
      async () => {
        const messages = await core.latestMessages(session.sessionId, session.sessionType)

        return messages.some(
          (message) => message.textData === text && message.status === SENT_STATUS,
        )
      },
      { timeout: 15_000 },
    )
    .toBe(true)

  const events = await core.events()
  expect(events.some((event) => event.eventId === 4 && event.text.includes(text))).toBe(true)
})

test('sends an audio message and stores its frame count', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)
  const frameCount = 4

  await expect(
    core.sendAudio(session.sessionId, session.sessionType, frameCount, 160),
  ).resolves.toBe(true)

  await expect
    .poll(
      async () => {
        const messages = await core.latestMessages(session.sessionId, session.sessionType)

        return messages.some(
          (message) =>
            message.msgType === AUDIO_MESSAGE_TYPE &&
            message.frameCount === frameCount &&
            message.status === SENT_STATUS,
        )
      },
      { timeout: 15_000 },
    )
    .toBe(true)
})
