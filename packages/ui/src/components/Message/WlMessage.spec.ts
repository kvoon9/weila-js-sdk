import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import WlMessage from './WlMessage.vue'
import WlMessageContent from './WlMessageContent.vue'
import WlMessageAvatar from './WlMessageAvatar.vue'

describe('WlMessage 组件测试', () => {
  it('正确渲染自己发送的消息（右侧对齐）', () => {
    const wrapper = mount(WlMessage, {
      props: { from: 'self' },
      slots: {
        default: '测试消息内容'
      }
    })
    
    expect(wrapper.classes()).toContain('justify-end')
    expect(wrapper.text()).toContain('测试消息内容')
  })

  it('正确渲染对方发送的消息（左侧对齐）', () => {
    const wrapper = mount(WlMessage, {
      props: { from: 'other' },
      slots: {
        default: '对方消息'
      }
    })
    
    expect(wrapper.classes()).toContain('flex-row-reverse')
  })
})

describe('WlMessageContent 组件测试', () => {
  it('contained 变体渲染正确', () => {
    const wrapper = mount(WlMessageContent, {
      props: { variant: 'contained' }
    })
    
    expect(wrapper.classes()).toContain('max-w-[80%]')
    expect(wrapper.classes()).toContain('px-4')
  })

  it('flat 变体渲染正确', () => {
    const wrapper = mount(WlMessageContent, {
      props: { variant: 'flat' }
    })
    
    // flat 变体没有 contained 的样式
    expect(wrapper.classes()).toContain('wl-message-content')
  })
})

describe('WlMessage 组合测试', () => {
  it('组合 WlMessage + WlMessageContent 渲染正确', () => {
    const wrapper = mount(WlMessage, {
      props: { from: 'self' },
      slots: {
        default: WlMessageContent
      }
    })
    
    expect(wrapper.findComponent(WlMessageContent).exists()).toBe(true)
  })

  it('组合 WlMessage + WlMessageAvatar + WlMessageContent 完整流程', () => {
    const wrapper = mount(WlMessage, {
      props: { from: 'other' },
      slots: {
        default: [WlMessageAvatar, WlMessageContent]
      }
    })
    
    expect(wrapper.findComponent(WlMessage).exists()).toBe(true)
    expect(wrapper.findComponent(WlMessageAvatar).exists()).toBe(true)
    expect(wrapper.findComponent(WlMessageContent).exists()).toBe(true)
  })
})
