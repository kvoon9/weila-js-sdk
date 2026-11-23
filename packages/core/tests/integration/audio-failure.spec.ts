import { expect, integrationEnv, test } from './fixtures'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

/**
 * A voice message whose audio file is gone from the server (April cleanup,
 * 404 today) must not leave the caller's playing state hanging: playSingle
 * returns false and emits the single-family PLAYING_END indication.
 */
test('a 404 audio message fails loudly instead of silently', async ({ core }) => {
  const result = await core.page.evaluate(async () => {
    const coreObj = window.weilaCore

    const indications: Array<{ state?: number; source?: number }> = []

    const listener = (eventId: number, eventData: any) => {
      if (eventId === 2) {
        indications.push({
          state: eventData?.indData?.state,
          source: eventData?.indData?.source,
        })
      }
    }

    coreObj.weila_onEvent(listener)

    const played = await coreObj.weila_playSingle({
      combo_id: `probe-404-${Date.now()}`,
      senderId: 1,
      sessionId: '0',
      sessionType: 0,
      msgId: 1,
      msgType: 1,
      created: Math.floor(Date.now() / 1000),
      autoReply: 0,
      status: 0,
      audioData: {
        audioUrl: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com/removed-by-server.wav',
        frameCount: 0,
      },
    })

    return { played, indications }
  })

  expect(result.played).toBe(false)
  expect(result.indications).toContainEqual({ state: 2, source: 2 })
})
