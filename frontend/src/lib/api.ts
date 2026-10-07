import { markBackendUp, trackRequest } from './backendStatus'
import { LOCAL_USER } from './localAuth'
import { apiScopes, msalInstance } from './msal'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/**
 * Wakes the backend. It scales to zero when idle and takes ~20s to start, so this is sent as soon as the site
 * loads: by the time the visitor taps something it's usually up. The reply doesn't matter (and no-cors means
 * it never needs a CORS preflight), so failures are ignored.
 */
export function wakeBackend() {
  fetch(`${API_BASE_URL}/health`, { mode: 'no-cors', cache: 'no-store' })
    .then(markBackendUp)
    .catch(() => {})
}

const RETRY_STATUSES = [502, 503, 504]
const RETRY_DELAYS_MS = [2000, 4000, 8000]

/**
 * fetch for the backend. While it's starting up (or briefly unreachable) reads are retried a few times, and the
 * "getting things started" overlay shows if that takes more than a second. Writes aren't retried: they might
 * already have gone through.
 */
async function backendFetch(url: string, init?: RequestInit, background = false): Promise<Response> {
  const finished = background ? () => {} : trackRequest()
  const canRetry = (init?.method ?? 'GET') === 'GET'
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(url, init)
        if (!RETRY_STATUSES.includes(response.status)) markBackendUp()
        if (!canRetry || !RETRY_STATUSES.includes(response.status) || attempt >= RETRY_DELAYS_MS.length) return response
      } catch (error) {
        if (!canRetry || attempt >= RETRY_DELAYS_MS.length) throw error
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  } finally {
    finished()
  }
}

async function getAccessToken(): Promise<string | null> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return null
  try {
    const result = await msalInstance.acquireTokenSilent({ scopes: apiScopes, account })
    return result.accessToken
  } catch (error) {
    // Log so silent-acquisition failures (e.g. app registration misconfig, blocked third-party
    // cookies) are visible in devtools instead of silently surfacing as a generic 401.
    const code = (error as { errorCode?: string }).errorCode
    console.error(`acquireTokenSilent failed (${code ?? 'unknown'}), falling back to interactive redirect:`, error)
    await msalInstance.acquireTokenRedirect({ scopes: apiScopes, account })
    return null
  }
}

export async function apiFetch(path: string, init?: RequestInit, background = false): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (LOCAL_USER) {
    headers.set('X-Local-User', LOCAL_USER)
  } else {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await backendFetch(`${API_BASE_URL}${path}`, { ...init, headers }, background)
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`)
  }
  return response
}

// For endpoints that need no sign-in (guest pages): never attaches a token or triggers a login redirect.
export async function publicFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await backendFetch(`${API_BASE_URL}${path}`, init)
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`)
  }
  return response
}
