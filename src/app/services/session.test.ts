import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test'

import {
  getCachedKey,
  getCachedMasterPassword,
  lock,
  setCachedKey,
  setCachedMasterPassword,
  startInactivityTimer
} from './session.ts'

describe('session cache', () => {
  afterEach(() => {
    lock()
  })

  test('getCachedKey returns null by default', () => {
    expect(getCachedKey()).toBeNull()
  })

  test('setCachedKey / getCachedKey roundtrip', async () => {
    const key = await crypto.subtle.generateKey(
      {name: 'AES-GCM', length: 256},
      true,
      ['encrypt', 'decrypt']
    )
    setCachedKey(key)
    expect(getCachedKey()).toBe(key)
  })

  test('setCachedMasterPassword / getCachedMasterPassword roundtrip', () => {
    setCachedMasterPassword('hunter2')
    expect(getCachedMasterPassword()).toBe('hunter2')
  })

  test('lock clears both key and master password', async () => {
    const key = await crypto.subtle.generateKey(
      {name: 'AES-GCM', length: 256},
      true,
      ['encrypt', 'decrypt']
    )
    setCachedKey(key)
    setCachedMasterPassword('hunter2')

    lock()

    expect(getCachedKey()).toBeNull()
    expect(getCachedMasterPassword()).toBeNull()
  })
})

describe('startInactivityTimer', () => {
  let listeners: Array<{event: string; fn: EventListener}> = []
  let scheduled: Array<{fn: () => void; ms: number; id: number}> = []
  let nextId = 1

  beforeEach(() => {
    listeners = []
    scheduled = []
    nextId = 1

    globalThis.document = {
      addEventListener: mock((event: string, fn: EventListener) => {
        listeners.push({event, fn})
      }),
      removeEventListener: mock((event: string, fn: EventListener) => {
        listeners = listeners.filter((l) => !(l.event === event && l.fn === fn))
      })
    } as unknown as Document

    globalThis.window = {
      setTimeout: mock((fn: () => void, ms: number) => {
        const id = nextId++
        scheduled.push({fn, ms, id})
        return id
      }),
      clearTimeout: mock((id: number) => {
        scheduled = scheduled.filter((s) => s.id !== id)
      })
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    lock()
  })

  test('schedules lock + onLock after timeout', () => {
    const onLock = mock(() => {})
    setCachedMasterPassword('hunter2')

    startInactivityTimer(onLock, 1000)

    expect(scheduled.length).toBe(1)
    expect(scheduled[0]?.ms).toBe(1000)

    scheduled[0]?.fn()

    expect(onLock).toHaveBeenCalledTimes(1)
    expect(getCachedMasterPassword()).toBeNull()
  })

  test('activity events reschedule the timer', () => {
    startInactivityTimer(() => {}, 1000)
    const initial = scheduled[0]?.id

    const keypress = listeners.find((l) => l.event === 'keypress')
    keypress?.fn(new Event('keypress'))

    expect(scheduled.length).toBe(1)
    expect(scheduled[0]?.id).not.toBe(initial)
  })

  test('cleanup removes listeners and cancels timer', () => {
    const onLock = mock(() => {})
    const cleanup = startInactivityTimer(onLock, 1000)

    cleanup()

    expect(listeners.length).toBe(0)
    expect(scheduled.length).toBe(0)
  })
})
