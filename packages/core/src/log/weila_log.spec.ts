import { describe, expect, it } from 'vitest'
import { getLogger, initLogger, isLoggerEnabled, setLoggerEnabled } from './weila_log'

describe('weila log', () => {
  it('enables only the configured namespaces', () => {
    initLogger('CORE:test')
    expect(getLogger('CORE:test').enabled).toBe(true)
    expect(getLogger('OTHER:test').enabled).toBe(false)
  })

  it('keeps the logger enabled by default', () => {
    expect(isLoggerEnabled()).toBe(true)
    setLoggerEnabled(false)
    expect(isLoggerEnabled()).toBe(true)
  })
})
