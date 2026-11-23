import { describe, expect, it } from 'vitest'
import {
  calculateAudioDuration,
  calculateOpusDataFrame,
  decompositionAudioData,
  getErrorMsg,
  getOpusDataFrameCount,
  getOpusDataListFromPttData,
  packPttPacket,
} from './weila_utils'
import { WL_PttPackType } from 'main/weila_internal_data'

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

describe('packPttPacket', () => {
  /** One short opus frame: flag byte 0x20, three payload bytes. */
  const shortFrame = new Uint8Array([0x20, 0x11, 0x22, 0x33])
  /** One long opus frame: flag 0x80, two-byte big-endian length, five payload bytes. */
  const longFrame = new Uint8Array([0x80, 0x21, 0x22, 0x23, 0x24, 0x25])

  it('packs a short frame with a one-byte length and advances to inter-pack', () => {
    const { packet, nextState } = packPttPacket(
      [shortFrame],
      { curMarker: WL_PttPackType.PTT_FIRST_PACK, seqOfPackage: 0, seq: 7 },
      false,
    )

    expect(Array.from(packet.data)).toEqual([0x20, 0x03, 0x11, 0x22, 0x33])
    expect(packet.mark).toBe(WL_PttPackType.PTT_FIRST_PACK)
    expect(packet.seq).toBe(7)
    expect(packet.seqInPackage).toBe(0)
    expect(packet.frameCount).toBe(1)
    expect(packet.sourceType).toBe(5)
    expect(nextState).toEqual({
      curMarker: WL_PttPackType.PTT_INTER_PACK,
      seqOfPackage: 1,
      seq: 7,
    })
  })

  it('packs a long frame with a two-byte big-endian length', () => {
    const { packet } = packPttPacket(
      [longFrame],
      { curMarker: WL_PttPackType.PTT_INTER_PACK, seqOfPackage: 3, seq: 1 },
      false,
    )

    expect(Array.from(packet.data)).toEqual([0x80, 0x00, 0x05, 0x21, 0x22, 0x23, 0x24, 0x25])
    expect(packet.mark).toBe(WL_PttPackType.PTT_INTER_PACK)
    expect(packet.seqInPackage).toBe(3)
  })

  it('concatenates mixed frames without gaps', () => {
    const { packet } = packPttPacket(
      [shortFrame, longFrame, shortFrame],
      { curMarker: WL_PttPackType.PTT_INTER_PACK, seqOfPackage: 1, seq: 2 },
      false,
    )

    expect(Array.from(packet.data)).toEqual([
      0x20, 0x03, 0x11, 0x22, 0x33, 0x80, 0x00, 0x05, 0x21, 0x22, 0x23, 0x24, 0x25, 0x20, 0x03,
      0x11, 0x22, 0x33,
    ])
    expect(packet.frameCount).toBe(3)
  })

  it('upgrades a single last pack to whole-pack and ends the burst', () => {
    const { packet, nextState } = packPttPacket(
      [shortFrame],
      { curMarker: WL_PttPackType.PTT_FIRST_PACK, seqOfPackage: 0, seq: 9 },
      true,
    )

    expect(packet.mark).toBe(WL_PttPackType.PTT_WHOLE_PACK)
    expect(nextState.curMarker).toBe(WL_PttPackType.PTT_END_PACK)
    expect(nextState.seqOfPackage).toBe(1)
  })

  it('marks a last pack after earlier packs as end-pack', () => {
    const { packet } = packPttPacket(
      [shortFrame],
      { curMarker: WL_PttPackType.PTT_INTER_PACK, seqOfPackage: 2, seq: 9 },
      true,
    )

    expect(packet.mark).toBe(WL_PttPackType.PTT_END_PACK)
  })

  it('keeps an empty last flush as a marker-only packet', () => {
    const { packet } = packPttPacket(
      [],
      { curMarker: WL_PttPackType.PTT_INTER_PACK, seqOfPackage: 4, seq: 3 },
      true,
    )

    expect(packet.frameCount).toBe(0)
    expect(packet.data).toHaveLength(0)
    expect(packet.mark).toBe(WL_PttPackType.PTT_END_PACK)
    expect(packet.seqInPackage).toBe(4)
  })

  it('does not modify the input frames', () => {
    const frames = [shortFrame]

    packPttPacket(
      frames,
      { curMarker: WL_PttPackType.PTT_FIRST_PACK, seqOfPackage: 0, seq: 0 },
      true,
    )

    expect(frames).toHaveLength(1)
    expect(Array.from(frames[0])).toEqual([0x20, 0x11, 0x22, 0x33])
  })

  it('round-trips through the frame parser used on the receiving side', () => {
    const { packet } = packPttPacket(
      [shortFrame, longFrame],
      { curMarker: WL_PttPackType.PTT_FIRST_PACK, seqOfPackage: 0, seq: 0 },
      false,
    )

    const frames = getOpusDataListFromPttData(packet.data)

    expect(frames.map((frame) => Array.from(frame))).toEqual([
      [0x20, 0x11, 0x22, 0x33],
      [0x80, 0x21, 0x22, 0x23, 0x24, 0x25],
    ])
  })
})

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
