import { apiFetch } from './api'

export type AccountStatus = 'pending' | 'approved' | 'denied'

export interface Me {
  id: number
  email: string
  display_name: string | null
  nickname: string | null
  avatar_color: string
  status: AccountStatus
  is_admin: boolean
  /** Links of the home tiles this account can see (see HOME_TILES in tiles.ts). */
  tile_hrefs: string[]
}

export interface Account extends Omit<Me, 'tile_hrefs'> {
  created_at: string
}

/** `background`: the app is already showing from a cached copy, so don't put the waking-up overlay over it. */
export async function getMe(background = false): Promise<Me> {
  const response = await apiFetch('/api/accounts/me', undefined, background)
  return response.json()
}

export async function updateMe(updates: { nickname?: string | null; avatar_color?: string }): Promise<Me> {
  const response = await apiFetch('/api/accounts/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
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

export async function getAccountTileAccess(id: number): Promise<number[]> {
  const response = await apiFetch(`/api/accounts/${id}/tile-access`)
  return response.json()
}

export async function getAllTileAccess(): Promise<Record<number, number[]>> {
  const response = await apiFetch('/api/accounts/tile-access')
  return response.json()
}

export async function updateAccountTileAccess(id: number, tileIds: number[]): Promise<number[]> {
  const response = await apiFetch(`/api/accounts/${id}/tile-access`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tile_ids: tileIds }),
  })
  return response.json()
}
