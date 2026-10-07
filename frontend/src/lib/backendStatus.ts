import { useSyncExternalStore } from 'react'

// The backend scales to zero when idle and takes ~20s to start. These helpers notice when we're probably waiting
// on a cold start, so the app can say what's happening (see WakeOverlay) instead of looking like a feature is slow.

/** The backend stays up for 30 minutes after its last request; treat it as asleep a little before that. */
const COLD_AFTER_MS = 25 * 60 * 1000
/** A request still pending after this long while the backend seems asleep gets the overlay. */
const SLOW_AFTER_MS = 1000

let lastAnswer = 0
let nextId = 0
const waiting = new Set<number>()
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

/** The backend answered (any HTTP reply from the app itself counts). */
export function markBackendUp() {
  lastAnswer = Date.now()
}

const backendSeemsUp = () => Date.now() - lastAnswer < COLD_AFTER_MS

/**
 * Call when a request starts; call the returned function when it ends. If the backend seems asleep and the request
 * is still pending after a second, the overlay shows until it ends.
 */
export function trackRequest(): () => void {
  if (backendSeemsUp()) return () => {}
  const id = nextId++
  const timer = setTimeout(() => {
    waiting.add(id)
    emit()
  }, SLOW_AFTER_MS)
  return () => {
    clearTimeout(timer)
    if (waiting.delete(id)) emit()
  }
}

/** True while requests are waiting on a backend that seems to be waking up. */
export function useBackendWaking(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => waiting.size > 0,
  )
}
