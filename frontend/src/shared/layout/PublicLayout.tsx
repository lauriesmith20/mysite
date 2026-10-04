import { useIsAuthenticated } from '@azure/msal-react'
import type { ReactNode } from 'react'
import { LOCAL_USER } from '../../lib/localAuth'
import AuthGate from '../auth/AuthGate'
import GuestHeader from './GuestHeader'
import Sidebar from './Sidebar'

// Public pages share the normal header: the full nav when signed in, a sign-in bar otherwise.
export default function PublicLayout({ children }: { children: ReactNode }) {
  const signedIn = useIsAuthenticated() || Boolean(LOCAL_USER)
  if (!signedIn) {
    return (
      <div className="min-h-screen">
        <GuestHeader />
        {children}
      </div>
    )
  }
  return (
    <AuthGate>
      <div className="min-h-screen">
        <Sidebar />
        {children}
      </div>
    </AuthGate>
  )
}
