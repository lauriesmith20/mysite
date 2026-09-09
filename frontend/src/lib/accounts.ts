import { apiFetch } from './api'

export type AccountStatus = 'pending' | 'approved' | 'denied'

export interface Me {
  email: string
  display_name: string | null
  status: AccountStatus
  is_admin: boolean
}

export interface Account extends Me {
  id: number
  created_at: string
}

export async function getMe(): Promise<Me> {
  const response = await apiFetch('/api/accounts/me')
  return response.json()
}

export async function listAccounts(): Promise<Account[]> {
  const response = await apiFetch('/api/accounts/')
  return response.json()
}

export async function updateAccount(
  id: number,
  updates: { status?: AccountStatus; is_admin?: boolean },
): Promise<Account> {
  const response = await apiFetch(`/api/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  return response.json()
}
