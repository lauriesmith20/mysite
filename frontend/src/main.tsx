import { EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import WakeOverlay from './components/WakeOverlay'
import './index.css'
import { wakeBackend } from './lib/api'
import { msalInstance } from './lib/msal'
import { rememberReturningUser } from './lib/returningUser'

// Keep the active account in sync so acquireTokenSilent has an account to use, and remember who
// it is so a later visit can sign them back in automatically.
msalInstance.addEventCallback((event) => {
  const account =
    event.payload && typeof event.payload === 'object' && 'account' in event.payload
      ? event.payload.account
      : null
  if (
    (event.eventType === EventType.LOGIN_SUCCESS ||
      event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
    account
  ) {
    msalInstance.setActiveAccount(account)
    rememberReturningUser(account.username)
  }
})

// Start waking the backend right away, in parallel with the sign-in setup below.
wakeBackend()

async function bootstrap() {
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(accounts[0])
  }

  // HashRouter avoids needing server-side rewrites for client-side routes on GitHub Pages.
  // Sign-in is enforced inside <App /> per route, so public pages can sit outside the AuthGate.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <HashRouter>
          <App />
          <WakeOverlay />
        </HashRouter>
      </MsalProvider>
    </StrictMode>,
  )
}

bootstrap()
