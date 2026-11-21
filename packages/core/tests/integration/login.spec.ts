import { expect, integrationEnv, test } from './fixtures'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

test('logs in and syncs the account sessions', async ({ core }) => {
  const summary = core.loginSummary

  expect(summary).toBeDefined()
  expect(summary!.userId).toBeGreaterThan(0)
  expect(summary!.userName).toEqual(expect.any(String))
  expect(summary!.tokenLength).toBeGreaterThan(0)

  const sessions = await core.sessions()

  expect(sessions.length).toBeGreaterThan(0)

  for (const session of sessions) {
    expect(session.sessionId.length).toBeGreaterThan(0)
    expect(Number.isInteger(session.sessionType)).toBe(true)
  }
})

test('emits the data prepare success event', async ({ core }) => {
  const events = await core.events()

  expect(events.some((event) => event.eventId === 0 && event.text.includes('"state":2'))).toBe(true)
})
