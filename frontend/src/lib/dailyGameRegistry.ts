import { MAX_LIVES } from './countryHopperGame'
import type { DailyGameResult } from './dailyGames'

// The once-a-day games that record results. To add a game: add an entry here (and in the backend's
// features/daily_games/registry.py), then have the game page call submitResult when it finishes.
// The score-history page at /games/<key>/history works for any game listed here.

export interface DailyGameInfo {
  key: string
  title: string
  /** Where the game itself lives. */
  playPath: string
  /** Highest possible score; scores run from 0 to this. */
  maxScore: number
  /** What one point of score looks like, e.g. a suitcase. */
  scoreIcon: string
  /** One short line of detail for a history row, built from the result's game-specific `details`. */
  describe: (result: DailyGameResult) => string
  /** For games with lives: how many were left, shown under the score. Omit for games without lives. */
  lives?: (result: { details: Record<string, unknown> }) => { left: number; max: number } | null
}

function count(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

export const DAILY_GAMES: Record<string, DailyGameInfo> = {
  'country-hopper': {
    key: 'country-hopper',
    title: 'Country Hopper',
    playPath: '/country-hopper',
    maxScore: 5,
    scoreIcon: '🧳',
    describe: ({ details, outcome }) => {
      const borders = count(details.borders)
      const shortest = count(details.shortest)
      if (outcome === 'lost') return 'Out of lives'
      if (borders === null) return ''
      return `${borders} borders${shortest !== null ? ` (shortest ${shortest})` : ''}`
    },
    lives: ({ details }) => {
      const left = count(details.lives_left)
      return left === null ? null : { left, max: MAX_LIVES }
    },
  },
}
