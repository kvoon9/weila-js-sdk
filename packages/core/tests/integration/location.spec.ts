import { expect, integrationEnv, test } from './fixtures'
import { CoreSession } from './harness'

test.skip(
  !integrationEnv?.peer,
  'Set WEILA_TEST_PEER_ACCOUNT and WEILA_TEST_PEER_PASSWORD in tests/integration/.env.integration.',
)

const INDIVIDUAL_SESSION_TYPE = 17
const LOCATION_MESSAGE_TYPE = 5

test('receives a location message from another account', async ({ core }) => {
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

    const startedAt = Math.floor(Date.now() / 1000)
    const name = `[sdk-int] loc ${Date.now()}`

    await expect(
      core.sendPosition(peerId, INDIVIDUAL_SESSION_TYPE, {
        locationType: 'gcj02',
        latitude: 22.543099,
        longitude: 114.057868,
        name,
        address: 'Shenzhen',
      }),
    ).resolves.toBe(true)

    await expect
      .poll(
        async () => {
          const messages = await peer.latestMessages(senderId, INDIVIDUAL_SESSION_TYPE)

          return messages.some(
            (message) =>
              message.msgType === LOCATION_MESSAGE_TYPE && message.created >= startedAt - 5,
          )
        },
        { timeout: 20_000 },
      )
      .toBe(true)
  } finally {
    await peer.close()
  }
})
