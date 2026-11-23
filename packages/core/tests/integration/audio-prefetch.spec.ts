import { expect, integrationEnv, test } from './fixtures'
import { pickSession } from './harness'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

/**
 * History audio messages arrive as URL-only (the proto carries no duration),
 * so the SDK prefetches their blobs in the background after storing them:
 * the AUDIO_READY indication fires and the stored message gains frameCount
 * and data, giving the UI a duration and the next play an instant start.
 */
test('history audio messages get prefetched with duration', async ({ core }) => {
  const session = pickSession(await core.sessions(), integrationEnv!)

  const before = await core.page.evaluate(
    async (args) => {
      const coreObj = window.weilaCore
      const audioReadyInd = window['__sdk'].WL_ExtEventID.WL_EXT_MSG_AUDIO_READY_IND
      window['__audioReadyCounts'] = []
      coreObj.weila_onEvent((eventId: number, eventData: any) => {
        if (eventId === audioReadyInd && eventData?.audioData) {
          window['__audioReadyCounts'].push(eventData.audioData.frameCount)
        }
      })

      const msgs = await coreObj.weila_getMsgDatas(args.sessionId, args.sessionType, 0, 20)
      const audioCount = msgs.filter((message: any) => Number(message.msgType) === 1).length

      return { audioCount }
    },
    { sessionId: session.sessionId, sessionType: session.sessionType },
  )

  expect(before.audioCount).toBeGreaterThan(0)

  await expect
    .poll(() => core.page.evaluate(() => window['__audioReadyCounts'].length), { timeout: 20_000 })
    .toBeGreaterThan(0)

  const readyCounts = await core.page.evaluate(() => window['__audioReadyCounts'].slice())

  for (const frameCount of readyCounts) {
    expect(frameCount).toBeGreaterThan(0)
  }

  const after = await core.latestMessages(session.sessionId, session.sessionType, 20)

  const withDuration = after.filter(
    (message) => message.msgType === 1 && (message.frameCount ?? 0) > 0,
  )

  expect(withDuration.length).toBeGreaterThan(0)
})
