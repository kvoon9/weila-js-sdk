import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from '@playwright/test'
import { chromium } from '@playwright/test'
import { startServer } from '../server.mjs'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..')
const ENV_FILE = join(PACKAGE, 'tests/integration/.env.integration')

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
  }
}

export class CoreSession {
  loginSummary?: LoginSummary

  private constructor(
    private readonly server: { url: string; close: () => Promise<void> },
    private readonly browser: Browser,
    readonly page: Page,
    readonly env: IntegrationEnv,
  ) {}

  static async open(env: IntegrationEnv): Promise<CoreSession> {
    const server = await startServer()
    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.goto(server.url)
    await page.waitForFunction(() => window['__ready'] === true)

    return new CoreSession(server, browser, page, env)
  }

  async login(): Promise<LoginSummary> {
    const summary = await this.page.evaluate(async (env) => {
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

      const user = await core.weila_login(env.account, env.password, env.countryCode, {
        md5: env.md5,
      })

      const token = await core.weila_get_token()

      return {
        userId: Number(user.userId),
        userName: String(user.userName ?? ''),
        tokenLength: String(token ?? '').length,
      }
    }, this.env)

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
        }))
      },
      { sessionId, sessionType, count },
    )
  }

  async events(): Promise<Array<{ eventId: number; text: string }>> {
    return this.page.evaluate(() => window.weilaEvents.slice(-50))
  }

  async close(): Promise<void> {
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
