import { describe, expect, it } from 'vitest'
import {
  calculateAudioDuration,
  calculateOpusDataFrame,
  decompositionAudioData,
  getErrorMsg,
  getOpusDataFrameCount,
  getOpusDataListFromPttData,
} from './weila_utils'

/**
 * The wire format per frame is a flag byte, a length field (two bytes for
 * flag & 0x80, one otherwise), then the payload. A long frame that is not
 * the first frame must have its length read at the frame's own offset; the
 * parsers once read absolute bytes 1-2 and misparsed every such frame.
 */
function buildFrames(): Uint8Array {
  const shortFrame = [0x00, 0x03, 0x11, 0x12, 0x13]
  const longFrame = [0x80, 0x00, 0x05, 0x21, 0x22, 0x23, 0x24, 0x25]

  return new Uint8Array([...shortFrame, ...longFrame, ...shortFrame])
}

describe('opus frame parsers', () => {
  it('count every frame including a long frame after the first', () => {
    const frames = buildFrames()

    expect(calculateOpusDataFrame(frames)).toBe(3)
    expect(getOpusDataFrameCount(frames)).toBe(3)
  })

  it('split frames at their own offsets, preserving flags and payloads', () => {
    const frames = buildFrames()

    const split = getOpusDataListFromPttData(frames)

    expect(split.map((frame) => Array.from(frame))).toEqual([
      [0x00, 0x11, 0x12, 0x13],
      [0x80, 0x21, 0x22, 0x23, 0x24, 0x25],
      [0x00, 0x11, 0x12, 0x13],
    ])
  })

  it('decompose the whole buffer into one payload for a short sequence', () => {
    const frames = buildFrames()

    const payloads = decompositionAudioData(frames)

    expect(payloads).toHaveLength(1)
    expect(Array.from(payloads[0].data)).toEqual(Array.from(frames))
    expect(payloads[0].frameCount).toBe(3)
  })
})

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
