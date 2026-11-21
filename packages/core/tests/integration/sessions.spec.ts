import { expect, integrationEnv, test } from './fixtures'
import { pickSession } from './harness'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

test('updates a session setting and restores it', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)
  const original = await core.getSessionSetting(session.sessionId, session.sessionType)
  const next = { mute: !original?.mute, tts: !original?.tts }

  await expect(
    core.updateSessionSetting(session.sessionId, session.sessionType, next),
  ).resolves.toBe(true)

  await expect
    .poll(() => core.getSessionSetting(session.sessionId, session.sessionType))
    .toEqual(next)

  await core.updateSessionSetting(session.sessionId, session.sessionType, {
    mute: original?.mute ?? false,
    tts: original?.tts ?? true,
  })
})

test('marks a session read up to its last message', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)
  const before = await core.getSessionFromDb(session.sessionId, session.sessionType)
  const lastMsgId = before?.lastMsgId ?? 0

  await expect(
    core.setSessionMsgRead(session.sessionId, session.sessionType, lastMsgId),
  ).resolves.toBe(true)

  await expect
    .poll(
      async () => (await core.getSessionFromDb(session.sessionId, session.sessionType))?.readMsgId,
    )
    .toBe(lastMsgId)
})

test('sets and clears the active session', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)

  await expect(core.setActiveSession(session.sessionId, session.sessionType)).resolves.toBe(true)
  await core.clearActiveSession()
})
