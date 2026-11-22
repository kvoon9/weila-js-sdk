import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from '@playwright/test'
import { chromium } from '@playwright/test'
import { startServer } from '../server.mjs'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..')
const ENV_FILE = join(PACKAGE, 'tests/integration/.env.integration')

export interface SessionExtra {
  sessionName?: string
  sessionAvatar?: string
  memberCount?: number
}

export interface AccountCredentials {
  account: string
  password: string
  countryCode: string
}

export interface IntegrationEnv {
  account: string
  password: string
  countryCode: string
  appId: string
  appKey: string
  webSock: string
  md5: boolean
  sessionId?: string
  sessionType?: number
  peer?: AccountCredentials
}

export interface LoginSummary {
  userId: number
  userName: string
  tokenLength: number
}

interface SessionTarget {
  sessionId: string
  sessionType: number
  sessionName: string
}

interface StoredMessage {
  textData: string
  msgType: number
  status: number
  frameCount?: number
  audioUrl: string
  created: number
}

function loadEnvFile(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)
}

export function readIntegrationEnv(): IntegrationEnv | null {
  loadEnvFile()
  const account = process.env.WEILA_TEST_ACCOUNT
  const password = process.env.WEILA_TEST_PASSWORD
  const appId = process.env.WEILA_TEST_APP_ID
  const appKey = process.env.WEILA_TEST_APP_KEY

  if (!account || !password || !appId || !appKey) return null

  const peerAccount = process.env.WEILA_TEST_PEER_ACCOUNT
  const peerPassword = process.env.WEILA_TEST_PEER_PASSWORD

  return {
    account,
    password,
    countryCode: process.env.WEILA_TEST_COUNTRY_CODE ?? '0',
    appId,
    appKey,
    webSock: process.env.WEILA_TEST_WSS ?? 'wss://api.voischat.cn/voischat/bridge',
    md5: process.env.WEILA_TEST_MD5 === 'true',
    sessionId: process.env.WEILA_TEST_SESSION_ID,
    sessionType: process.env.WEILA_TEST_SESSION_TYPE
      ? Number(process.env.WEILA_TEST_SESSION_TYPE)
      : undefined,
    peer:
      peerAccount && peerPassword
        ? {
            account: peerAccount,
            password: peerPassword,
            countryCode: process.env.WEILA_TEST_PEER_COUNTRY_CODE ?? '0',
          }
        : undefined,
  }
}

export interface CoreSessionOptions {
  launchArgs?: string[]
}

export class CoreSession {
  loginSummary?: LoginSummary

  private constructor(
    private readonly server: { url: string; close: () => Promise<void> },
    private readonly browser: Browser,
    readonly page: Page,
    readonly env: IntegrationEnv,
    readonly credentials: AccountCredentials,
  ) {}

  static async open(
    env: IntegrationEnv,
    credentials?: AccountCredentials,
    options: CoreSessionOptions = {},
  ): Promise<CoreSession> {
    const server = await startServer()
    const browser = await chromium.launch({ args: options.launchArgs })
    const page = await browser.newPage()
    await page.goto(server.url)
    await page.waitForFunction(() => window['__ready'] === true)

    return new CoreSession(
      server,
      browser,
      page,
      env,
      credentials ?? {
        account: env.account,
        password: env.password,
        countryCode: env.countryCode,
      },
    )
  }

  async login(): Promise<LoginSummary> {
    const summary = await this.page.evaluate(
      async (env) => {
        const sdk = window['__sdk']
        window.weilaEvents = []
        const core = new sdk.WeilaCore()
        window.weilaCore = core
        core.weila_onEvent((eventId: number, eventData: any) => {
          let text = ''

          try {
            text = JSON.stringify(eventData)
          } catch {
            text = String(eventData)
          }

          window.weilaEvents.push({ eventId, text: text.slice(0, 400) })
        })

        await core.weila_init({ appId: env.appId, appKey: env.appKey, webSock: env.webSock })

        const user = await core.weila_login(
          env.credentials.account,
          env.credentials.password,
          env.credentials.countryCode,
          { md5: env.md5 },
        )

        const token = await core.weila_get_token()

        return {
          userId: Number(user.userId),
          userName: String(user.userName ?? ''),
          tokenLength: String(token ?? '').length,
        }
      },
      { ...this.env, credentials: this.credentials },
    )

    this.loginSummary = summary

    return summary
  }

  async waitForSessions(timeout = 20_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        try {
          return window.weilaCore.weila_getSessions().length > 0
        } catch {
          return false
        }
      },
      undefined,
      { timeout },
    )
  }

  async waitForReady(timeout = 30_000): Promise<void> {
    await this.page.waitForFunction(
      () =>
        window.weilaEvents.some(
          (event: { eventId: number; text: string }) =>
            event.eventId === 0 && event.text.includes('"state":2'),
        ),
      undefined,
      { timeout },
    )
  }

  async sessions(): Promise<SessionTarget[]> {
    return this.page.evaluate(() =>
      window.weilaCore.weila_getSessions().map((session: any) => ({
        sessionId: String(session.sessionId),
        sessionType: Number(session.sessionType),
        sessionName: String(session.sessionName ?? ''),
      })),
    )
  }

  async startSession(
    peerId: string,
    sessionType: number,
    extra?: SessionExtra,
  ): Promise<{ sessionId: string; sessionType: number }> {
    return this.page.evaluate(
      async (args) => {
        const session = await window.weilaCore.weila_startNewSession(
          args.peerId,
          args.sessionType,
          args.extra,
        )

        return {
          sessionId: String(session?.sessionId ?? ''),
          sessionType: Number(session?.sessionType ?? 0),
        }
      },
      { peerId, sessionType, extra },
    )
  }

  async sendPosition(
    sessionId: string,
    sessionType: number,
    position: {
      locationType: string
      latitude: number
      longitude: number
      name: string
      address: string
    },
  ): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_sendPosition(args.sessionId, args.sessionType, args.position)
      },
      { sessionId, sessionType, position },
    )
  }

  async getSessionFromDb(
    sessionId: string,
    sessionType: number,
  ): Promise<{ comboId: string; readMsgId: number; lastMsgId: number } | null> {
    return this.page.evaluate(
      async (args) => {
        const session = await window.weilaCore.weila_getSessionFromDb(
          args.sessionId,
          args.sessionType,
        )

        return session
          ? {
              comboId: String(session.combo_id_type ?? ''),
              readMsgId: Number(session.readMsgId ?? 0),
              lastMsgId: Number(session.lastMsgId ?? 0),
            }
          : null
      },
      { sessionId, sessionType },
    )
  }

  async getSessionSetting(
    sessionId: string,
    sessionType: number,
  ): Promise<{ mute: boolean; tts: boolean } | null> {
    return this.page.evaluate(
      async (args) => {
        const setting = await window.weilaCore.weila_getSessionSetting(
          args.sessionId,
          args.sessionType,
        )

        return setting ? { mute: Boolean(setting.mute), tts: Boolean(setting.tts) } : null
      },
      { sessionId, sessionType },
    )
  }

  async updateSessionSetting(
    sessionId: string,
    sessionType: number,
    params: { mute?: boolean; tts?: boolean },
  ): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_updateSessionSetting(
          args.sessionId,
          args.sessionType,
          args.params,
        )
      },
      { sessionId, sessionType, params },
    )
  }

  async setSessionMsgRead(sessionId: string, sessionType: number, msgId: number): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_setSessionMsgRead(
          args.sessionId,
          args.sessionType,
          args.msgId,
        )
      },
      { sessionId, sessionType, msgId },
    )
  }

  async setActiveSession(sessionId: string, sessionType: number): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_setActiveSession(args.sessionId, args.sessionType)
      },
      { sessionId, sessionType },
    )
  }

  async clearActiveSession(): Promise<void> {
    await this.page.evaluate(() => window.weilaCore.weila_clearActiveSession())
  }

  async sendText(sessionId: string, sessionType: number, text: string): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_sendTextMsg(args.sessionId, args.sessionType, args.text)
      },
      { sessionId, sessionType, text },
    )
  }

  async sendAudio(
    sessionId: string,
    sessionType: number,
    frameCount: number,
    bytes: number,
  ): Promise<boolean> {
    return this.page.evaluate(
      (args) => {
        return window.weilaCore.weila_sendAudioMsgByData(args.sessionId, args.sessionType, {
          data: new Uint8Array(args.bytes).fill(7),
          frameCount: args.frameCount,
        })
      },
      { sessionId, sessionType, frameCount, bytes },
    )
  }

  async latestMessages(
    sessionId: string,
    sessionType: number,
    count = 10,
  ): Promise<StoredMessage[]> {
    return this.page.evaluate(
      async (args) => {
        const list = await window.weilaCore.weila_getMsgDatas(
          args.sessionId,
          args.sessionType,
          0,
          args.count,
        )

        return list.map((message: any) => ({
          textData: String(message.textData ?? ''),
          msgType: Number(message.msgType),
          status: Number(message.status),
          frameCount:
            message.audioData?.frameCount === undefined
              ? undefined
              : Number(message.audioData.frameCount),
          audioUrl: String(message.audioData?.audioUrl ?? ''),
          created: Number(message.created ?? 0),
        }))
      },
      { sessionId, sessionType, count },
    )
  }

  async audioInit(): Promise<boolean> {
    return this.page.evaluate(() => window.weilaCore.weila_audioInit())
  }

  /** Whether this machine can start a microphone at all (may hang under TCC). */
  async canCaptureAudio(): Promise<boolean> {
    return this.page.evaluate(async () => {
      try {
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])

        for (const track of stream.getTracks()) track.stop()

        return true
      } catch {
        return false
      }
    })
  }

  async talk(
    holdMs: number,
    sessionId: string,
    sessionType: number,
  ): Promise<{ granted: boolean; released: boolean }> {
    return this.page.evaluate(
      async (args) => {
        const granted = await window.weilaCore.weila_requestTalk(args.sessionId, args.sessionType)

        await new Promise((resolve) => setTimeout(resolve, args.holdMs))

        const released = await window.weilaCore.weila_releaseTalk()

        return { granted, released }
      },
      { holdMs, sessionId, sessionType },
    )
  }

  async events(): Promise<Array<{ eventId: number; text: string }>> {
    return this.page.evaluate(() => window.weilaEvents.slice(-50))
  }

  async close(): Promise<void> {
    // End the server session cleanly: the logout handshake closes the DB only
    // after the server confirmed, so waiting for that frees the account for
    // the next spec file's login instead of racing a kick notification.
    if (this.loginSummary) {
      await this.page.evaluate(() => window.weilaCore?.weila_logout()).catch(() => {})
      await this.page
        .waitForFunction(
          () =>
            window.weilaCore.weila_get_token().then(
              () => false,
              () => true,
            ),
          undefined,
          { timeout: 5000 },
        )
        .catch(() => {})
    }

    await this.browser.close()
    await this.server.close()
  }
}

export function pickSession(sessions: SessionTarget[], env: IntegrationEnv): SessionTarget {
  if (env.sessionId && env.sessionType !== undefined) {
    return (
      sessions.find(
        (session) => session.sessionId === env.sessionId && session.sessionType === env.sessionType,
      ) ?? { sessionId: env.sessionId, sessionType: env.sessionType, sessionName: '' }
    )
  }

  const first = sessions[0]

  if (!first) throw new Error('The account exposed no sessions after login')

  return first
}
