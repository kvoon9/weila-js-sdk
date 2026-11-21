import { describe, expect, it } from 'vitest'
import { WeilaRingBuffer } from './weila_ringbuffer'

describe('WeilaRingBuffer', () => {
  it('pulls fewer frames than requested when the buffer is short', () => {
    const ring = new WeilaRingBuffer(4, false)
    expect(ring.push(new Int16Array([1, 2, 3]))).toBe(3)
    expect(ring.frameAvailable).toBe(3)

    const first = new Int16Array(2)
    expect(ring.pull(first)).toBe(2)
    expect([...first]).toEqual([1, 2])

    const rest = new Int16Array(4)
    expect(ring.pull(rest)).toBe(1)
    expect([...rest.slice(0, 1)]).toEqual([3])
  })

  it('wraps writes across the end of the buffer', () => {
    const ring = new WeilaRingBuffer(4, false)
    ring.push(new Int16Array([1, 2, 3]))
    ring.pull(new Int16Array(3))
    ring.push(new Int16Array([4, 5, 6]))

    const out = new Int16Array(3)
    expect(ring.pull(out)).toBe(3)
    expect([...out]).toEqual([4, 5, 6])
  })

  it('drops frames that do not fit', () => {
    const ring = new WeilaRingBuffer(4, false)
    expect(ring.push(new Int16Array([1, 2, 3, 4, 5, 6]))).toBe(4)
    expect(ring.frameAvailable).toBe(4)

    const out = new Int16Array(4)
    ring.pull(out)
    expect([...out]).toEqual([1, 2, 3, 4])
  })

  it('clears every counter and supports Float32 samples', () => {
    const ring = new WeilaRingBuffer(4, true)
    ring.push(new Float32Array([0.5, 0.25]))
    ring.clear()
    expect(ring.frameAvailable).toBe(0)

    ring.push(new Float32Array([0.5, 0.25]))
    const out = new Float32Array(2)
    ring.pull(out)
    expect([...out]).toEqual([0.5, 0.25])
  })
})
