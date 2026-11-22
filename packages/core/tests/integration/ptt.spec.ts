import { expect, integrationEnv, test } from './fixtures'
import { CoreSession, pickSession } from './harness'

test.skip(
  !integrationEnv,
  'Set WEILA_TEST_ACCOUNT, WEILA_TEST_PASSWORD, WEILA_TEST_APP_ID, and WEILA_TEST_APP_KEY in tests/integration/.env.integration.',
)

test.skip(
  !integrationEnv?.peer,
  'Set WEILA_TEST_PEER_ACCOUNT and WEILA_TEST_PEER_PASSWORD in tests/integration/.env.integration.',
)

const INDIVIDUAL_SESSION_TYPE = 17
const AUDIO_MESSAGE_TYPE = 1
const SENT_STATUS = 1
const MIN_TALK_FRAMES = 25

test(
  'records a PTT talk burst and stores the sent audio message',
  { tag: '@ptt' },
  async ({ coreAudio }) => {
    test.skip(
      !(await coreAudio.canCaptureAudio()),
      'This machine cannot start a microphone (headless audio stack or macOS TCC). Run where audio capture works.',
    )

    const session = pickSession(await coreAudio.sessions(), integrationEnv!)

    await expect(coreAudio.audioInit()).resolves.toBe(true)

    const startedAt = Math.floor(Date.now() / 1000)

    // Hold the floor for ~1.6s with the synthetic microphone: at 20ms opus
    // frames that is at least one 25-frame packet plus the release remainder.
    await expect(coreAudio.talk(1600, session.sessionId, session.sessionType)).resolves.toEqual({
      granted: true,
      released: true,
    })

    await expect
      .poll(
        async () => {
          const messages = await coreAudio.latestMessages(session.sessionId, session.sessionType)

          return messages.some(
            (message) =>
              message.msgType === AUDIO_MESSAGE_TYPE &&
              (message.frameCount ?? 0) >= MIN_TALK_FRAMES &&
              message.status === SENT_STATUS &&
              message.created >= startedAt - 5,
          )
        },
        { timeout: 20_000 },
      )
      .toBe(true)
  },
)

test('a peer account receives the PTT audio message', { tag: '@ptt' }, async ({ coreAudio }) => {
  test.skip(
    !(await coreAudio.canCaptureAudio()),
    'This machine cannot start a microphone (headless audio stack or macOS TCC). Run where audio capture works.',
  )

  const peer = await CoreSession.open(integrationEnv!, integrationEnv!.peer)

  try {
    await peer.login()
    await peer.waitForReady()

    const senderId = String(coreAudio.loginSummary!.userId)
    const peerId = String(peer.loginSummary!.userId)

    await coreAudio.startSession(peerId, INDIVIDUAL_SESSION_TYPE, {
      sessionName: 'sdk-int-ptt',
      sessionAvatar: '',
      memberCount: 2,
    })

    await expect(coreAudio.audioInit()).resolves.toBe(true)

    const startedAt = Math.floor(Date.now() / 1000)

    await expect(coreAudio.talk(1600, peerId, INDIVIDUAL_SESSION_TYPE)).resolves.toEqual({
      granted: true,
      released: true,
    })

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
