import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import WlStatusIndicator from './components/WlStatusIndicator.vue'
import { createWeilaUi, provideWeilaUiI18n, useWeilaUiI18n } from './i18n'
import { formatMsgTime, formatTimeAgo } from './utils/time'

describe('weila ui i18n', () => {
  it('renders zh-CN by default without installing the plugin', () => {
    const wrapper = mount(WlStatusIndicator, {
      props: { status: 'connected' },
    })

    expect(wrapper.text()).toContain('已连接')
  })

  it('renders configured English messages through the plugin', () => {
    const wrapper = mount(WlStatusIndicator, {
      props: { status: 'connected' },
      global: {
        plugins: [createWeilaUi({ locale: 'en' })],
      },
    })

    expect(wrapper.text()).toContain('Connected')
  })

  it('allows custom messages to override built-in messages', () => {
    const wrapper = mount(WlStatusIndicator, {
      props: { status: 'connected' },
      global: {
        plugins: [
          createWeilaUi({
            locale: 'en',
            messages: {
              en: {
                status: {
                  connected: 'Online',
                },
              },
            },
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('Online')
  })

  it('falls back to zh-CN when a configured locale misses a key', () => {
    const wrapper = mount(WlStatusIndicator, {
      props: { status: 'idle' },
      global: {
        plugins: [
          createWeilaUi({
            locale: 'custom',
            messages: {
              custom: {
                status: {
                  connected: 'Custom connected',
                },
              },
            },
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('未连接')
  })

  it('supports local provider overrides', () => {
    const LocalProvider = defineComponent({
      components: { WlStatusIndicator },
      setup() {
        provideWeilaUiI18n({
          locale: 'en',
          messages: {
            en: {
              status: {
                error: 'Offline',
              },
            },
          },
        })
      },
      template: '<WlStatusIndicator status="error" />',
    })

    const wrapper = mount(LocalProvider)

    expect(wrapper.text()).toContain('Offline')
  })

  it('formats relative and message times with provided translations', () => {
    const t = (key: string, params: Record<string, string | number> = {}) => {
      const messages: Record<string, string> = {
        'time.yesterday': 'Yesterday {time}',
        'time.justNow': 'Just now',
        'time.minutesAgo': '{minutes}m ago',
        'time.hoursAgo': '{hours}h ago',
        'time.daysAgo': '{days}d ago',
      }

      return (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(9, 5, 0, 0)

    expect(formatTimeAgo(nowSeconds - 30, t)).toBe('Just now')
    expect(formatTimeAgo(nowSeconds - 5 * 60, t)).toBe('5m ago')
    expect(formatTimeAgo(nowSeconds - 2 * 60 * 60, t)).toBe('2h ago')
    expect(formatMsgTime(Math.floor(yesterday.getTime() / 1000), t)).toBe('Yesterday 09:05')
  })

  it('interpolates params from useWeilaUiI18n', () => {
    const Consumer = defineComponent({
      setup() {
        const { t } = useWeilaUiI18n()
        return { text: t('time.minutesAgo', { minutes: 3 }) }
      },
      template: '<span>{{ text }}</span>',
    })

    const wrapper = mount(Consumer, {
      global: {
        plugins: [createWeilaUi({ locale: 'en' })],
      },
    })

    expect(wrapper.text()).toBe('3m ago')
  })
})
