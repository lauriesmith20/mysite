import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, type Me } from '../lib/accounts'
import { apiScopes } from '../lib/msal'

interface AuthContextValue {
  me: Me
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthGate')
  return context
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { instance } = useMsal()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    setError(null)
    getMe()
      .then(setMe)
      .catch(() => setError('Failed to load account status.'))
  }, [isAuthenticated])

  function signIn() {
    instance.loginRedirect({ scopes: apiScopes })
  }

  function signOut() {
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

  return <AuthContext.Provider value={{ me, signOut }}>{children}</AuthContext.Provider>
}
