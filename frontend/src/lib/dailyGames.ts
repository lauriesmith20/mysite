import { apiFetch } from './api'
import type { AccountSummary } from './friends'
import type { RivalDayResult } from './gameScores'

// Results of once-a-day puzzle games, tied to the signed-in account. Generic across games: see
// dailyGameRegistry.ts for how each game is labelled, and the backend's features/daily_games.

export type DailyOutcome = 'won' | 'lost'

export interface DailyGameResult {
  id: number
  game_key: string
  /** The puzzle's calendar date (YYYY-MM-DD) as the player saw it. */
  puzzle_date: string
  score: number
  outcome: DailyOutcome
  /** Game-specific extras (e.g. the route taken). */
  details: Record<string, unknown>
  created_at: string
}

export interface DailyResultInput {
  puzzle_date: string
  score: number
  outcome: DailyOutcome
  details: Record<string, unknown>
}

/** Records a finished game. The first result for a day is final: re-posting returns the stored one. */
export async function submitResult(gameKey: string, input: DailyResultInput): Promise<DailyGameResult> {
  const response = await apiFetch(`/api/daily-games/${gameKey}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.json()
}

/** The signed-in account's results for a game, newest day first. */
export async function listResults(gameKey: string): Promise<DailyGameResult[]> {
  const response = await apiFetch(`/api/daily-games/${gameKey}/results`)
  return response.json()
}

/** One day's result, or null if that day hasn't been played (or recorded) yet. */
export async function getResult(gameKey: string, day: string): Promise<DailyGameResult | null> {
  try {
    const response = await apiFetch(`/api/daily-games/${gameKey}/results/${day}`)
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API error 404')) return null
    throw error
  }
}

/** "Tue 6 Oct" for a puzzle day (YYYY-MM-DD). */
export function formatPuzzleDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Stats ────────────────────────────────────────────────────────────────────────────────────────

export interface PlayStats {
  played: number
  wins: number
  /** Mean score across all recorded days (a lost game counts as its score, usually 0). */
  averageScore: number
  /** Consecutive days played up to today (or yesterday: today's game may not be played yet). */
  currentStreak: number
  bestStreak: number
}

const DAY_MS = 86_400_000

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS)
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function playStats(results: DailyGameResult[], today: string = localDateKey()): PlayStats {
  const days = [...new Set(results.map((r) => dayNumber(r.puzzle_date)))].sort((a, b) => b - a)

  let best = 0
  let run = 0
  days.forEach((day, i) => {
    run = i > 0 && days[i - 1] - day === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })

  let current = 0
  const latest = days[0]
  if (latest !== undefined && dayNumber(today) - latest <= 1) {
    current = 1
    for (let i = 1; i < days.length && days[i - 1] - days[i] === 1; i++) current++
  }

  const total = results.reduce((sum, r) => sum + r.score, 0)
  return {
    played: results.length,
    wins: results.filter((r) => r.outcome === 'won').length,
    averageScore: results.length ? total / results.length : 0,
    currentStreak: current,
    bestStreak: best,
  }
}

// ── Rivals ───────────────────────────────────────────────────────────────────────────────────────

/** A rival's standing on one puzzle day (from an accepted challenge on this game). */
export interface RivalToday {
  /** The rivalry's game id, for linking to its page. */
  game_id: number
  friend: AccountSummary
  friend_played: boolean
  /** Only included once you've finished that day yourself. */
  friend_result: RivalDayResult | null
}

/** How your rivals did on a puzzle day. Their result is only revealed once you've finished it. */
export async function listRivalsForDay(gameKey: string, day: string): Promise<RivalToday[]> {
  const response = await apiFetch(`/api/daily-games/${gameKey}/rivals/${day}`)
  return response.json()
}

// ── Rivalry reveal ───────────────────────────────────────────────────────────────────────────────

const revealKey = (gameId: number, day: string) => `rival-reveal:${gameId}:${day}`

/** Whether today's 3-2-1 reveal for this rivalry has already been shown on this device. */
export function hasSeenReveal(gameId: number, day: string): boolean {
  try {
    return localStorage.getItem(revealKey(gameId, day)) === '1'
  } catch {
    return false
  }
}

export function markRevealSeen(gameId: number, day: string) {
  try {
    localStorage.setItem(revealKey(gameId, day), '1')
  } catch {
    // storage unavailable: the reveal may just play again next visit
  }
}
