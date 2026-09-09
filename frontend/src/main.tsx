import { EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthGate from './components/AuthGate.tsx'
import './index.css'
import { msalInstance } from './lib/msal'

// Keep the active account in sync so acquireTokenSilent has an account to use.
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
  }
})

async function bootstrap() {
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(accounts[0])
  }

  // HashRouter avoids needing server-side rewrites for client-side routes on GitHub Pages.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthGate>
          <HashRouter>
            <App />
          </HashRouter>
        </AuthGate>
      </MsalProvider>
    </StrictMode>,
  )
}

bootstrap()
