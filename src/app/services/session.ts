let cachedKey: CryptoKey | null = null
let cachedMasterPassword: string | null = null

export function getCachedKey(): CryptoKey | null {
  return cachedKey
}

export function setCachedKey(key: CryptoKey | null): void {
  cachedKey = key
}

export function getCachedMasterPassword(): string | null {
  return cachedMasterPassword
}

export function setCachedMasterPassword(password: string | null): void {
  cachedMasterPassword = password
}

export function lock(): void {
  cachedKey = null
  cachedMasterPassword = null
}

const ACTIVITY_EVENTS = ['mousedown', 'keypress', 'scroll', 'touchstart']

export function startInactivityTimer(
  onLock: () => void,
  timeoutMs: number
): () => void {
  let timerId: number | null = null

  const clear = (): void => {
    if (timerId !== null) {
      window.clearTimeout(timerId)
      timerId = null
    }
  }

  const schedule = (): void => {
    clear()
    timerId = window.setTimeout(() => {
      lock()
      onLock()
    }, timeoutMs)
  }

  for (const event of ACTIVITY_EVENTS) {
    document.addEventListener(event, schedule, {passive: true})
  }
  schedule()

  return () => {
    for (const event of ACTIVITY_EVENTS) {
      document.removeEventListener(event, schedule)
    }
    clear()
  }
}
