import { apiFetch } from './api'

export interface Game {
  id: number
  name: string
  image_url: string | null
  laurie_score: number
  maeve_score: number
  is_daily: boolean
  last_updated: string | null
}

export interface ScoreHistoryEntry {
  id: number
  player: 'laurie' | 'maeve'
  delta: number
  resulting_score: number
  changed_by: string
  created_at: string
}

export async function listGames(): Promise<Game[]> {
  const response = await apiFetch('/api/game-scores/')
  return response.json()
}

export async function getGame(id: number): Promise<Game> {
  const response = await apiFetch(`/api/game-scores/${id}`)
  return response.json()
}

export async function createGame(
  name: string,
  imageUrl: string | null,
  isDaily: boolean,
): Promise<Game> {
  const response = await apiFetch('/api/game-scores/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, image_url: imageUrl, is_daily: isDaily }),
  })
  return response.json()
}

export async function updateScore(id: number, player: 'laurie' | 'maeve'): Promise<Game> {
  const response = await apiFetch(`/api/game-scores/${id}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, delta: 1 }),
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
