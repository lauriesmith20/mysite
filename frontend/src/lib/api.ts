import { LOCAL_USER } from './localAuth'
import { apiScopes, msalInstance } from './msal'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

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

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (LOCAL_USER) {
    headers.set('X-Local-User', LOCAL_USER)
  } else {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`)
  }
  return response
}

// For endpoints that need no sign-in (guest pages): never attaches a token or triggers a login redirect.
export async function publicFetch(path: string): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`)
  }
  return response
}
