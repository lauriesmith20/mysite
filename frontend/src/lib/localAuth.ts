// Local-only dev convenience: set VITE_LOCAL_USER=dummy|dummy-admin|maeve in frontend/.env.local to
// authenticate as a seeded dummy account (see backend/src/backend/auth.py LOCAL_USERS) instead of
// signing in with Microsoft. Vite only exposes this when running the local dev server.
export const LOCAL_USER = import.meta.env.VITE_LOCAL_USER as string | undefined
