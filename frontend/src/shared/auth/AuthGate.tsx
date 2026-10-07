import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getMe, type Me } from '../../lib/accounts'
import { LOCAL_USER } from '../../lib/localAuth'
import { msalInstance } from '../../lib/msal'
import { autoSignIn, forgetReturningUser, signIn } from '../../lib/returningUser'

interface AuthContextValue {
  me: Me
  signOut: () => void
  refreshMe: () => void
}

// The account's details are kept in the browser, so a returning visitor sees the app straight away (name, tiles)
// without waiting on a backend that may be asleep. It's refreshed from the backend each time, and only an approved
// account is kept (a pending or denied one must always be checked).
const ME_CACHE_KEY = 'me-cache:v1'

function accountKey(): string | null {
  return LOCAL_USER ?? (msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0])?.username ?? null
}

function readCachedMe(): Me | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ME_CACHE_KEY) ?? 'null') as { key?: string; me?: Me } | null
    return saved?.me && saved.key === accountKey() && saved.me.status === 'approved' ? saved.me : null
  } catch {
    return null
  }
}

function writeCachedMe(me: Me | null) {
  try {
    if (me?.status === 'approved') localStorage.setItem(ME_CACHE_KEY, JSON.stringify({ key: accountKey(), me }))
    else localStorage.removeItem(ME_CACHE_KEY)
  } catch {
    // storage unavailable: the app just waits for the backend each time
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthGate')
  return context
}

/** Like useAuth, but null instead of throwing: for public pages that also work for guests. */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext)
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated() || Boolean(LOCAL_USER)
  const { instance } = useMsal()
  const [me, setMe] = useState<Me | null>(() => (isAuthenticated ? readCachedMe() : null))
  const [error, setError] = useState<string | null>(null)
  const hadCachedMe = useRef(me !== null)

  function load(background: boolean) {
    return getMe(background).then((fresh) => {
      setMe(fresh)
      writeCachedMe(fresh)
    })
  }

  useEffect(() => {
    if (!isAuthenticated) return
    setError(null)
    // With a cached account the app is already showing, so a failed refresh isn't worth an error screen.
    load(hadCachedMe.current).catch(() => {
      if (!hadCachedMe.current) setError('Failed to load account status.')
    })
  }, [isAuthenticated])

  function refreshMe() {
    load(true).catch(() => {})
  }

  // Someone who has signed in here before and has since been signed out goes straight back to Microsoft.
  useEffect(() => {
    if (!isAuthenticated) autoSignIn()
  }, [isAuthenticated])

  function signOut() {
    if (LOCAL_USER) return // nothing to sign out of in local dev mode
    forgetReturningUser()
    writeCachedMe(null)
    instance.logoutRedirect()
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <button
          type="button"
          onClick={signIn}
          className="rounded-lg bg-[#66B2FF] px-4 py-2 text-white hover:opacity-90"
        >
          Sign in with Microsoft
        </button>
      </div>
    )
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center">{error}</div>
  }

  if (!me) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (me.status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Request submitted</h1>
        <p>Your account ({me.email}) is waiting for approval.</p>
        <button type="button" onClick={signOut} className="text-sm text-gray-500 underline">
          Sign out
        </button>
      </div>
    )
  }

  if (me.status === 'denied') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <button type="button" onClick={signOut} className="text-sm text-gray-500 underline">
          Sign out
        </button>
      </div>
    )
  }

  return <AuthContext.Provider value={{ me, signOut, refreshMe }}>{children}</AuthContext.Provider>
}
