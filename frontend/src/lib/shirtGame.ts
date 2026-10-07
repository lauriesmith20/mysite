import { publicFetch } from './api'

// Squad Numbers: a shirt with a number on it, and you guess the team, the season, then the player.
// The backend (features/shirt_game) holds the answers: it checks each guess and only reveals them as
// you get them right, or when the game is over. These routes need no sign-in, so guests can play; results of
// signed-in players go through the shared daily-games routes.

export const GAME_KEY = 'shirt-game'
export const MAX_LIVES = 3

export type Stage = 'team' | 'season' | 'player'
export const STAGES: Stage[] = ['team', 'season', 'player']

/** The three parts of the shirt that are drawn: left arm, body, right arm. */
export type ShirtPart = 'la' | 'b' | 'ra'

export interface ShirtKit {
  type: 'home' | 'away' | 'third'
  /** Hex colour (no #) per part. */
  colours: Record<ShirtPart, string | null>
  /** The plain outline image per part. */
  base: Record<ShirtPart, string>
  /** The pattern image per part, where the kit has one. */
  patterns: Record<ShirtPart, string | null>
}

export interface ShirtPuzzle {
  puzzle_date: string
  number: number
  /** The club's kits that season: home, away and third where they had them. */
  kits: ShirtKit[]
  /** Every team that can be the answer. */
  teams: string[]
  /** The right season plus three wrong ones, in order. */
  season_options: string[]
}

export interface GuessResult {
  correct: boolean
  /** The answer for that stage, once it's been guessed right. */
  answer: string | null
  /** The squad for the right team and season, handed out once the season is right. */
  squad: string[] | null
}

export interface ShirtAnswer {
  team: string
  season: string
  player: string
  squad: string[]
}

export async function getShirtPuzzle(day: string): Promise<ShirtPuzzle> {
  const response = await publicFetch(`/api/shirt-game/puzzles/${day}`)
  return response.json()
}

export async function guess(day: string, stage: Stage, value: string): Promise<GuessResult> {
  const response = await publicFetch(`/api/shirt-game/puzzles/${day}/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, value }),
  })
  return response.json()
}

/** All the answers, for showing once the game is over. */
export async function getShirtAnswer(day: string): Promise<ShirtAnswer> {
  const response = await publicFetch(`/api/shirt-game/puzzles/${day}/answer`)
  return response.json()
}

/** "2015-16" -> "15/16" for tight spaces. */
export function shortSeason(season: string): string {
  return `${season.slice(2, 4)}/${season.slice(5)}`
}

export function shareText({
  day,
  stages,
  livesLeft,
  url,
}: {
  day: string
  stages: boolean[]
  livesLeft: number
  url: string
}): string {
  const date = new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const goals = stages.map((ok) => (ok ? '⚽' : '⬜')).join('')
  const lives = `${'🧤'.repeat(livesLeft)}${'⬜'.repeat(MAX_LIVES - livesLeft)}`
  return `Squad Numbers ${date}\n${goals}  ${lives}\n${url}`
}
