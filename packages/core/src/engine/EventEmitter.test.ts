import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from './EventEmitter'

interface TestEvents extends Record<string, unknown> {
  ping: { value: number }
}

describe('EventEmitter', () => {
  it('invokes handlers on emit', () => {
    const ee = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    ee.on('ping', handler)
    ee.emit('ping', { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('returns an unsubscribe function from on()', () => {
    const ee = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    const off = ee.on('ping', handler)
    off()
    ee.emit('ping', { value: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('removeAllListeners clears every handler', () => {
    const ee = new EventEmitter<TestEvents>()
    const handler = vi.fn()
    ee.on('ping', handler)
    ee.removeAllListeners()
    ee.emit('ping', { value: 1 })
    expect(handler).not.toHaveBeenCalled()
  })
})
