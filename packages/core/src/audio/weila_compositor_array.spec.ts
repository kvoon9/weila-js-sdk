import { describe, expect, it } from 'vitest'
import CompoUint8Array from './weila_compositor_array'

describe('CompoUint8Array', () => {
  it('concatenates arrays in insertion order and splits them back', () => {
    const composer = new CompoUint8Array()
    composer.putArray(new Uint8Array([1, 2]))
    composer.putArray(new Uint8Array([3, 4, 5]))

    expect([...composer.getCompoArray()!]).toEqual([1, 2, 3, 4, 5])
    expect(composer.getCompoLengthList()).toEqual([2, 3])
    expect(composer.parseArrayList()!.map((value) => Array.from(value))).toEqual([
      [1, 2],
      [3, 4, 5],
    ])
  })

  it('appends a batch after an existing buffer', () => {
    const composer = new CompoUint8Array()
    composer.putArray(new Uint8Array([9]))
    composer.putArrays([new Uint8Array([1, 2]), new Uint8Array([3])])

    expect([...composer.getCompoArray()!]).toEqual([9, 1, 2, 3])
    expect(composer.getCompoLengthList()).toEqual([1, 2, 1])
  })

  it('round-trips an empty composer as null', () => {
    const composer = new CompoUint8Array()
    expect(composer.parseArrayList()).toBeNull()
  })
})
