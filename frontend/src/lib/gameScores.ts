import { apiFetch } from './api'
import type { AccountSummary } from './friends'

export interface Game {
  id: number
  creator: AccountSummary
  opponent: AccountSummary
  name: string
  image_url: string | null
  creator_score: number
  opponent_score: number
  is_daily: boolean
  last_updated: string | null
}

export interface ScoreHistoryEntry {
  id: number
  player_id: number
  delta: number
  resulting_score: number
  changed_by: string
  created_at: string
}

export async function listGamesWithFriend(friendId: number): Promise<Game[]> {
  const response = await apiFetch(`/api/game-scores/with/${friendId}`)
  return response.json()
}

export async function getGame(id: number): Promise<Game> {
  const response = await apiFetch(`/api/game-scores/${id}`)
  return response.json()
}

export async function createGame(
  opponentId: number,
  name: string,
  imageUrl: string | null,
  isDaily: boolean,
): Promise<Game> {
  const response = await apiFetch('/api/game-scores/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opponent_id: opponentId, name, image_url: imageUrl, is_daily: isDaily }),
  })
  return response.json()
}

export async function updateScore(id: number, playerId: number): Promise<Game> {
  const response = await apiFetch(`/api/game-scores/${id}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_id: playerId, delta: 1 }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? 'Failed to update score')
  }
  return response.json()
}

export async function updateGame(
  id: number,
  updates: { image_url?: string | null; is_daily?: boolean },
): Promise<Game> {
  const response = await apiFetch(`/api/game-scores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? 'Failed to update game')
  }
  return response.json()
}

export async function deleteGame(id: number): Promise<void> {
  const response = await apiFetch(`/api/game-scores/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? 'Failed to delete game')
  }
}

export async function getScoreHistory(id: number): Promise<ScoreHistoryEntry[]> {
  const response = await apiFetch(`/api/game-scores/${id}/history`)
  return response.json()
}

export function hasUpdatedToday(game: Game): boolean {
  if (!game.last_updated) return false
  const last = new Date(game.last_updated)
  const now = new Date()
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  )
}
