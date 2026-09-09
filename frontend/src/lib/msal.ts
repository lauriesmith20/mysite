import { PublicClientApplication, type Configuration } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID ?? ''

// Same app registration exposes its own API scope; personal Microsoft accounts only.
export const apiScopes = [`api://${clientId}/access_as_user`]

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin + import.meta.env.BASE_URL,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)
