import { apiFetch } from './api'

export type RelationStatus = 'none' | 'friends' | 'outgoing_request' | 'incoming_request'

export interface AccountSummary {
  id: number
  email: string
  display_name: string | null
  nickname: string | null
  avatar_color: string
}

export interface Friend extends AccountSummary {
  friendship_id: number
}

export interface FriendRequest {
  id: number
  requester: AccountSummary
  created_at: string
}

export interface DirectoryEntry extends AccountSummary {
  relation: RelationStatus
}

export async function listFriends(): Promise<Friend[]> {
  const response = await apiFetch('/api/friends/')
  return response.json()
}

export async function listIncomingRequests(): Promise<FriendRequest[]> {
  const response = await apiFetch('/api/friends/requests')
  return response.json()
}

export async function listDirectory(): Promise<DirectoryEntry[]> {
  const response = await apiFetch('/api/friends/directory')
  return response.json()
}

export async function sendFriendRequest(addresseeId: number): Promise<FriendRequest> {
  const response = await apiFetch('/api/friends/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addressee_id: addresseeId }),
  })
  return response.json()
}

export async function acceptFriendRequest(friendshipId: number): Promise<Friend> {
  const response = await apiFetch(`/api/friends/requests/${friendshipId}/accept`, { method: 'POST' })
  return response.json()
}

export async function declineFriendRequest(friendshipId: number): Promise<void> {
  await apiFetch(`/api/friends/requests/${friendshipId}/decline`, { method: 'POST' })
}

export async function removeFriend(friendshipId: number): Promise<void> {
  await apiFetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
}
