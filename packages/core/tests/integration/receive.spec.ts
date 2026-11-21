import { expect, integrationEnv, test } from './fixtures'
import { CoreSession } from './harness'

test.skip(
  !integrationEnv?.peer,
  'Set WEILA_TEST_PEER_ACCOUNT and WEILA_TEST_PEER_PASSWORD in tests/integration/.env.integration.',
)

const INDIVIDUAL_SESSION_TYPE = 17
const AUDIO_MESSAGE_TYPE = 1
const NEW_MESSAGE_EVENT = 5

test('receives a text and an audio message from another account', async ({ core }) => {
  const peer = await CoreSession.open(integrationEnv!, integrationEnv!.peer)

  try {
    await peer.login()
    await peer.waitForReady()

    const senderId = String(core.loginSummary!.userId)
    const peerId = String(peer.loginSummary!.userId)

    await core.startSession(peerId, INDIVIDUAL_SESSION_TYPE, {
      sessionName: 'sdk-int-peer',
      sessionAvatar: '',
      memberCount: 2,
    })

    const text = `[sdk-int] recv ${Date.now()}`
    await expect(core.sendText(peerId, INDIVIDUAL_SESSION_TYPE, text)).resolves.toBe(true)

    await expect
      .poll(
        async () => {
          const messages = await peer.latestMessages(senderId, INDIVIDUAL_SESSION_TYPE)

          return messages.some((message) => message.textData === text)
        },
        { timeout: 20_000 },
      )
      .toBe(true)

    const events = await peer.events()
    expect(events.some((event) => event.eventId === NEW_MESSAGE_EVENT)).toBe(true)

    const startedAt = Math.floor(Date.now() / 1000)
    await expect(core.sendAudio(peerId, INDIVIDUAL_SESSION_TYPE, 4, 160)).resolves.toBe(true)

    await expect
      .poll(
        async () => {
          const messages = await peer.latestMessages(senderId, INDIVIDUAL_SESSION_TYPE)

          return messages.some(
            (message) =>
              message.msgType === AUDIO_MESSAGE_TYPE &&
              message.audioUrl.length > 0 &&
              message.created >= startedAt - 5,
          )
        },
        { timeout: 20_000 },
      )
      .toBe(true)
  } finally {
    await peer.close()
  }
})
