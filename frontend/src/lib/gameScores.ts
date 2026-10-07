import { apiFetch } from './api'
import { localDateKey, type DailyGameResult, type DailyResultInput } from './dailyGames'
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
  /** Set for rivalries over a built-in daily game (scores then count days won). */
  daily_game_key: string | null
  /** For those rivalries: pending until the challenged player accepts. */
  challenge_status: 'pending' | 'accepted' | null
}

/** A challenge waiting for the signed-in user to accept or decline. */
export interface IncomingChallenge {
  id: number
  daily_game_key: string
  title: string
  challenger: AccountSummary
}

export interface RivalDayResult {
  score: number
  outcome: 'won' | 'lost'
  details: Record<string, unknown>
}

/** One puzzle day of a daily-game rivalry, from the signed-in user's point of view. */
export interface RivalDay {
  puzzle_date: string
  mine: RivalDayResult | null
  /** Only filled in once you've finished that day yourself. */
  theirs: RivalDayResult | null
  their_played: boolean
  winner: 'me' | 'them' | 'draw' | null
  /** What settled a decided day: "suitcases", "lives" or "hops". */
  decided_by: string | null
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

async function failure(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => null)
  throw new Error(body?.detail ?? fallback)
}

/** Challenge a friend to a rivalry over one of the built-in daily games. They have to accept it. */
export async function createChallenge(opponentId: number, dailyGameKey: string): Promise<Game> {
  const response = await apiFetch('/api/game-scores/challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opponent_id: opponentId, daily_game_key: dailyGameKey }),
  })
  return response.json()
}

export async function listIncomingChallenges(): Promise<IncomingChallenge[]> {
  const response = await apiFetch('/api/game-scores/challenges/incoming')
  return response.json()
}

export async function acceptChallenge(id: number): Promise<Game> {
  // Our local date, so the rivalry counts from today even if today's puzzle was played before accepting.
  const response = await apiFetch(`/api/game-scores/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ local_date: localDateKey() }),
  })
  if (!response.ok) return failure(response, 'Failed to accept challenge')
  return response.json()
}

export async function declineChallenge(id: number): Promise<void> {
  const response = await apiFetch(`/api/game-scores/${id}/decline`, { method: 'POST' })
  if (!response.ok) await failure(response, 'Failed to decline challenge')
}

/** Enters a result for the other player in a rivalry (for games played elsewhere, like Wordle). */
export async function submitRivalResult(gameId: number, input: DailyResultInput): Promise<DailyGameResult> {
  const response = await apiFetch(`/api/game-scores/${gameId}/rival-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.json()
}

export async function listRivalDays(id: number): Promise<RivalDay[]> {
  const response = await apiFetch(`/api/game-scores/${id}/days`)
  return response.json()
}
