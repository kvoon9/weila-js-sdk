import { describe, expect, it } from 'vitest'
import { calculateAudioDuration, getErrorMsg } from './weila_utils'

describe('calculateAudioDuration', () => {
  it('returns 0 for an empty or negative frame count', () => {
    expect(calculateAudioDuration(0)).toBe(0)
    expect(calculateAudioDuration(-10)).toBe(0)
  })

  it('rounds 20ms frames to whole seconds', () => {
    expect(calculateAudioDuration(1)).toBe(1)
    expect(calculateAudioDuration(50)).toBe(1)
    expect(calculateAudioDuration(100)).toBe(2)
    expect(calculateAudioDuration(250)).toBe(5)
  })
})

describe('getErrorMsg', () => {
  it('maps a known result code to its message', () => {
    expect(getErrorMsg('RET_CODE:105-MESSAGE:ignored')).toBe('账号或密码错误(设备不再自动登录)')
  })

  it('returns the input unchanged when it carries no result code', () => {
    expect(getErrorMsg('socket closed')).toBe('socket closed')
  })

  it('returns an empty message for an unknown result code', () => {
    expect(getErrorMsg('RET_CODE:999999-MESSAGE:ignored')).toBe('')
  })
})
