import { LOCAL_USER } from './localAuth'
import { apiScopes, msalInstance } from './msal'

// Remembers who last signed in on this device so they can be sent back to Microsoft automatically
// (with their email pre-filled) instead of having to find and click "Sign in" on every visit.
const HINT_KEY = 'returning-user'
// sessionStorage: the automatic redirect happens at most once per tab session, so a failed
// attempt falls back to the normal Sign in button instead of looping.
const TRIED_KEY = 'auto-signin-tried'

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

export function rememberReturningUser(email: string) {
  try {
    localStorage.setItem(HINT_KEY, email)
  } catch {
    // storage unavailable: sign-in still works, it just isn't remembered
  }
}

/** Call on an explicit sign-out so the user isn't signed straight back in. */
export function forgetReturningUser() {
  try {
    localStorage.removeItem(HINT_KEY)
    sessionStorage.removeItem(TRIED_KEY)
  } catch {
    // nothing to clear
  }
}

/** Interactive sign-in, with the remembered email pre-filled if there is one. */
export function signIn() {
  const loginHint = read(() => localStorage, HINT_KEY) ?? undefined
  msalInstance.loginRedirect({ scopes: apiScopes, loginHint }).catch(() => {})
}

/**
 * For returning visitors who are signed out: go to Microsoft once per tab session. Only call this
 * from pages that need or promote sign-in, never from public pages that guests may view.
 */
export function autoSignIn() {
  if (LOCAL_USER) return
  const loginHint = read(() => localStorage, HINT_KEY)
  if (!loginHint || msalInstance.getAllAccounts().length > 0) return
  if (read(() => sessionStorage, TRIED_KEY)) return
  try {
    sessionStorage.setItem(TRIED_KEY, '1')
  } catch {
    return // can't record the attempt, so don't risk a redirect loop
  }
  msalInstance.loginRedirect({ scopes: apiScopes, loginHint }).catch(() => {})
}
