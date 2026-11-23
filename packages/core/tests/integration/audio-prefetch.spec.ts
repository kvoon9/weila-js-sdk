import { expect, integrationEnv, test } from './fixtures'
import { CoreSession, pickSession } from './harness'

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

/**
 * Rows that were stored before the prefetch existed (or whose fetch once
 * failed) carry only a URL. Reading history must heal them too: the prefetch
 * hangs off the read result, not off the server-storage path.
 */
test('an already-stored message without data is healed on read', async () => {
  // Own session: the first test of this file already prefetched the shared
  // fixture's page, so a donor URL-only snapshot needs a fresh profile.
  const session = await CoreSession.open(integrationEnv!)

  try {
    await session.login()
    await session.waitForReady()
    await session.waitForSessions()

    const sessions = await session.sessions()
    const target = pickSession(sessions, integrationEnv!)

    const setup = await session.page.evaluate(
      async (args) => {
        const coreObj = window.weilaCore
        const audioReadyInd = window['__sdk'].WL_ExtEventID.WL_EXT_MSG_AUDIO_READY_IND
        window['__healReady'] = []

        const listener = (eventId: number, eventData: any) => {
          if (eventId === audioReadyInd && eventData?.combo_id === args.comboId) {
            window['__healReady'].push(eventData.audioData.frameCount)
          }
        }

        coreObj.weila_onEvent(listener)

        // First read returns the URL-only snapshot and starts the prefetch.
        const first = await coreObj.weila_getMsgDatas(args.sessionId, args.sessionType, 0, 20)

        const donor = first.find(
          (message: any) => Number(message.msgType) === 1 && message.audioData?.audioUrl,
        )

        if (!donor) return { error: 'no url-audio snapshot row' }

        // Plant a preexisting-style row straight into the SDK's store: URL
        // only, no data, newest by created.
        const candidates = (await indexedDB.databases()).filter((info) => info.name)

        const dbs = await Promise.all(
          candidates.map((info) => {
            return new Promise<IDBDatabase>((resolve, reject) => {
              const request = indexedDB.open(info.name!)

              request.addEventListener('success', () => resolve(request.result))
              request.addEventListener('error', () => reject(request.error))
            })
          }),
        )

        const opened = dbs.find((db) => Array.from(db.objectStoreNames).includes('msgDatas'))

        if (!opened) return { error: 'msgDatas store not found' }

        for (const db of dbs) {
          if (db !== opened) db.close()
        }

        const planted = {
          combo_id: args.comboId,
          senderId: 1,
          sessionId: args.sessionId,
          sessionType: args.sessionType,
          msgId: 1,
          msgType: 1,
          created: Math.floor(Date.now() / 1000),
          autoReply: 0,
          status: 2,
          audioData: { audioUrl: donor.audioData.audioUrl, frameCount: 0 },
        }

        await new Promise<void>((resolve, reject) => {
          const tx = opened.transaction('msgDatas', 'readwrite')
          tx.objectStore('msgDatas').put(planted)
          tx.addEventListener('complete', () => resolve())
          tx.addEventListener('error', () => reject(tx.error))
        })

        opened.close()

        // One more read like a re-render: its result now contains the
        // planted row, and the prefetch hanging off the read must heal it.
        await coreObj.weila_getMsgDatas(args.sessionId, args.sessionType, 0, 20)

        return {}
      },
      {
        sessionId: target.sessionId,
        sessionType: target.sessionType,
        comboId: `heal-probe-${Date.now()}`,
      },
    )

    expect(setup.error).toBeUndefined()

    await expect
      .poll(() => session.page.evaluate(() => window['__healReady'].length), { timeout: 20_000 })
      .toBeGreaterThan(0)

    const healed = await session.page.evaluate(() => window['__healReady'].slice())

    expect(healed.length).toBeGreaterThan(0)

    for (const frameCount of healed) {
      expect(frameCount).toBeGreaterThan(0)
    }
  } finally {
    await session.close()
  }
})
