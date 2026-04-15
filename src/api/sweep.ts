import {sweepExpiredVerificationCodes, type UsersDbDeps} from './db/users.ts'

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000

export function startSweepLoop(
  deps: UsersDbDeps = {},
  intervalMs: number = DEFAULT_INTERVAL_MS
): () => void {
  const tick = async (): Promise<void> => {
    try {
      const deleted = await sweepExpiredVerificationCodes(Date.now(), deps)
      if (deleted > 0) {
        console.log(`[sweep] removed ${deleted} expired verification codes`)
      }
    } catch (err) {
      console.error('[sweep] failed:', err)
    }
  }

  void tick()
  const handle = setInterval(tick, intervalMs)
  return () => clearInterval(handle)
}
