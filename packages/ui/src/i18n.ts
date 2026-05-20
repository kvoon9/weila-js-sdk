import type { App, InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

export type WeilaUiLocale = 'zh-CN' | 'en' | (string & {})

export type WeilaUiMessages = {
  [key: string]: string | WeilaUiMessages
}

export interface WeilaUiI18nOptions {
  locale?: WeilaUiLocale
  messages?: Partial<Record<WeilaUiLocale, WeilaUiMessages>>
}

export interface WeilaUiI18nContext {
  locale: Ref<WeilaUiLocale>
  messages: Record<string, WeilaUiMessages>
  t: WeilaUiTranslate
  setLocale: (locale: WeilaUiLocale) => void
}

export type WeilaUiTranslate = (key: string, params?: Record<string, string | number>) => string

export const DEFAULT_WEILA_UI_LOCALE: WeilaUiLocale = 'zh-CN'

export const weilaUiMessages = {
  'zh-CN': {
    status: {
      idle: '未连接',
      connecting: '连接中...',
      connected: '已连接',
      error: '连接错误',
    },
    session: {
      title: '会话',
      unknown: '未知',
      refresh: '刷新',
      failedToLoad: '加载会话失败',
      retry: '重试',
      empty: '暂无会话',
      deleting: '删除中',
      deleteSession: '删除会话',
      yesterday: '昨天',
      type: {
        personal: '个人',
        group: '群组',
        service: '服务',
        corpPersonal: '企业个人',
        corpGroup: '企业群组',
        corpTempGroup: '企业临时群组',
      },
      preview: {
        image: '[图片]',
        voice: '[语音消息]',
        video: '[视频]',
        file: '[文件]',
        location: '[位置]',
        ptt: '[对讲]',
      },
    },
    message: {
      loadMore: '加载更多',
      uploading: '上传中...',
      file: '文件',
      unsupported: '[不支持的消息类型]',
    },
    chat: {
      loadingSdk: '正在加载 SDK...',
      sendImage: '发送图片',
      sendFile: '发送文件',
      sendVideo: '发送视频',
      sendLocation: '发送位置',
      inputPlaceholder: '输入消息...',
      send: '发送',
      selectSession: '选择一个会话开始聊天',
    },
    time: {
      yesterday: '昨天 {time}',
      justNow: '刚刚',
      minutesAgo: '{minutes}分钟前',
      hoursAgo: '{hours}小时前',
      daysAgo: '{days}天前',
    },
  },
  en: {
    status: {
      idle: 'Disconnected',
      connecting: 'Connecting...',
      connected: 'Connected',
      error: 'Connection error',
    },
    session: {
      title: 'Sessions',
      unknown: 'Unknown',
      refresh: 'Refresh',
      failedToLoad: 'Failed to load sessions',
      retry: 'Retry',
      empty: 'No sessions found',
      deleting: 'Deleting',
      deleteSession: 'Delete session',
      yesterday: 'Yesterday',
      type: {
        personal: 'Personal',
        group: 'Group',
        service: 'Service',
        corpPersonal: 'Corp Personal',
        corpGroup: 'Corp Group',
        corpTempGroup: 'Corp Temp Group',
      },
      preview: {
        image: '[Image]',
        voice: '[Voice Message]',
        video: '[Video]',
        file: '[File]',
        location: '[Location]',
        ptt: '[PTT]',
      },
    },
    message: {
      loadMore: 'Load more',
      uploading: 'Uploading...',
      file: 'File',
      unsupported: '[Unsupported message type]',
    },
    chat: {
      loadingSdk: 'Loading SDK...',
      sendImage: 'Send Image',
      sendFile: 'Send File',
      sendVideo: 'Send Video',
      sendLocation: 'Send Location',
      inputPlaceholder: 'Type a message...',
      send: 'Send',
      selectSession: 'Select a session to start chatting',
    },
    time: {
      yesterday: 'Yesterday {time}',
      justNow: 'Just now',
      minutesAgo: '{minutes}m ago',
      hoursAgo: '{hours}h ago',
      daysAgo: '{days}d ago',
    },
  },
} satisfies Record<string, WeilaUiMessages>

export const weilaUiI18nKey: InjectionKey<WeilaUiI18nContext> = Symbol('weila-ui-i18n')

const fallbackContext = createWeilaUiI18nContext()

export function createWeilaUi(options: WeilaUiI18nOptions = {}) {
  const context = createWeilaUiI18nContext(options)

  return {
    install(app: App) {
      app.provide(weilaUiI18nKey, context)
    },
  }
}

export function provideWeilaUiI18n(options: WeilaUiI18nOptions = {}) {
  const context = createWeilaUiI18nContext(options)
  provide(weilaUiI18nKey, context)
  return context
}

export function useWeilaUiI18n() {
  return inject(weilaUiI18nKey, fallbackContext)
}

export function translateWeilaUi(key: string, params?: Record<string, string | number>) {
  return fallbackContext.t(key, params)
}

function createWeilaUiI18nContext(options: WeilaUiI18nOptions = {}): WeilaUiI18nContext {
  const locale = ref(options.locale ?? DEFAULT_WEILA_UI_LOCALE)
  const messages = mergeMessages(weilaUiMessages, options.messages)

  const context: WeilaUiI18nContext = {
    locale,
    messages,
    t(key, params) {
      const value = resolveMessage(messages[locale.value], key)
        ?? resolveMessage(messages[DEFAULT_WEILA_UI_LOCALE], key)
        ?? key

      return interpolate(value, params)
    },
    setLocale(nextLocale) {
      locale.value = nextLocale
    },
  }

  return context
}

function mergeMessages(
  base: Record<string, WeilaUiMessages>,
  overrides: WeilaUiI18nOptions['messages'] = {},
): Record<string, WeilaUiMessages> {
  const result: Record<string, WeilaUiMessages> = {}

  for (const [locale, messages] of Object.entries(base)) {
    result[locale] = deepMerge({}, messages)
  }

  for (const [locale, messages] of Object.entries(overrides)) {
    result[locale] = deepMerge(result[locale] ?? {}, messages ?? {})
  }

  return result
}

function deepMerge(target: WeilaUiMessages, source: WeilaUiMessages): WeilaUiMessages {
  const result: WeilaUiMessages = { ...target }

  for (const [key, value] of Object.entries(source)) {
    const existing = result[key]
    if (isMessageObject(existing) && isMessageObject(value)) {
      result[key] = deepMerge(existing, value)
    } else {
      result[key] = value
    }
  }

  return result
}

function resolveMessage(messages: WeilaUiMessages | undefined, key: string): string | undefined {
  if (!messages) return undefined

  let current: string | WeilaUiMessages | undefined = messages
  for (const segment of key.split('.')) {
    if (!isMessageObject(current)) return undefined
    current = current[segment]
  }

  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

function isMessageObject(value: unknown): value is WeilaUiMessages {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
