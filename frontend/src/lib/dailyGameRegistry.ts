import { MAX_LIVES } from './countryHopperGame'
import { MAX_LIVES as SHIRT_LIVES } from './shirtGame'
import type { DailyGameResult, DailyResultInput } from './dailyGames'
import { parseWordle } from './wordle'

// The once-a-day games that record results. To add a game: add an entry here (and in the backend's
// features/daily_games/registry.py), then have the game page call submitResult when it finishes.
// The score-history page at /games/<key>/history works for any game listed here.

/** For games played elsewhere (e.g. Wordle on nytimes.com): results come from pasted share text. */
export interface PasteSupport {
  /** Turns pasted text into a result to record, or null if it isn't recognised. */
  parse: (text: string) => DailyResultInput | null
  /** Shown when a paste can't be read. */
  notDetected: string
  buttonLabel: string
  /** What to do, shown under the button. */
  hint: string
}

export type ScoreCell = 'green' | 'yellow' | 'red'

export interface DailyGameInfo {
  key: string
  title: string
  /** Where the game itself lives (or, for a paste-in game, where its rivalries do). */
  playPath: string
  /** Where "back" goes from the score history page. */
  home: { to: string; label: string }
  /** One line about how the game is played, shown when picking a game to challenge someone to. */
  blurb: string
  /** Set for games whose results are pasted in rather than played in this app. */
  paste?: PasteSupport
  /** Highest possible score; scores run from 0 to this. */
  maxScore: number
  /** What one point of score looks like, e.g. a suitcase. */
  scoreIcon: string
  /** One short line of detail for a history row, built from the result's game-specific `details`. */
  describe: (result: DailyGameResult) => string
  /**
   * Draw a result as coloured squares instead of points (for games where a score out of N would mislead).
   * Wordle: one yellow square per missed guess then green for the solving one, or all red for a fail.
   */
  cells?: (result: { score: number; outcome: 'won' | 'lost'; details: Record<string, unknown> }) => ScoreCell[]
  /** A game-specific average for the history page, replacing "average score out of max". */
  averageStat?: (results: { score: number; outcome: 'won' | 'lost'; details: Record<string, unknown> }[]) => {
    value: string
    label: string
  }
  /** An optional very short label for a result (e.g. "4/6"), shown under the score in compact views. */
  short?: (result: { details: Record<string, unknown>; outcome: 'won' | 'lost' }) => string
  /** For games with lives: how many were left, shown under the score. Omit for games without lives. */
  lives?: (result: { details: Record<string, unknown> }) => { left: number; max: number; icon?: string } | null
}

function count(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

export const DAILY_GAMES: Record<string, DailyGameInfo> = {
  'country-hopper': {
    key: 'country-hopper',
    title: 'Country Hopper',
    playPath: '/country-hopper',
    home: { to: '/country-hopper', label: 'Back to Country Hopper' },
    blurb: 'Played here, new puzzle every day',
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
  wordle: {
    key: 'wordle',
    title: 'Wordle',
    // Played on nytimes.com, so there's no play page here: it lives in head-to-head rivalries.
    playPath: '/game-scores',
    home: { to: '/game-scores', label: 'Back to H2H Games' },
    blurb: 'Paste your result each day',
    maxScore: 6,
    scoreIcon: '🟩',
    describe: ({ details, outcome }) => {
      if (outcome === 'lost') return 'Not solved (X/6)'
      const attempts = count(details.attempts)
      if (attempts === null) return ''
      return `${attempts}/6${details.hard_mode === true ? ' · hard mode' : ''}`
    },
    cells: ({ details, outcome }) => {
      if (outcome === 'lost') return Array.from({ length: 6 }, () => 'red' as const)
      const attempts = count(details.attempts) ?? 1
      return [...Array.from({ length: attempts - 1 }, () => 'yellow' as const), 'green' as const]
    },
    // Average guesses over the games that were solved: a lower number is better.
    averageStat: (results) => {
      const solved = results
        .flatMap((r) => (r.outcome === 'won' ? [count(r.details.attempts)] : []))
        .filter((n) => n !== null)
      const mean = solved.length ? solved.reduce((sum, n) => sum + n, 0) / solved.length : null
      return { value: mean === null ? '–' : mean.toFixed(1), label: 'Avg guesses' }
    },
    short: ({ details, outcome }) => (outcome === 'lost' ? 'X/6' : `${count(details.attempts) ?? '?'}/6`),
    paste: {
      parse: parseWordle,
      notDetected: 'Wordle result not detected',
      buttonLabel: "Paste today's Wordle result",
      hint: 'Share your result from Wordle, then tap paste.',
    },
  },
  'shirt-game': {
    key: 'shirt-game',
    title: 'Squad Numbers',
    playPath: '/shirt-game',
    home: { to: '/shirt-game', label: 'Back to Squad Numbers' },
    blurb: 'Whose shirt is this? Guess the team, season and player',
    maxScore: 3,
    scoreIcon: '⚽',
    describe: ({ details, outcome }) => {
      if (outcome === 'lost' && !Array.isArray(details.stages)) return 'Out of lives'
      const stages = Array.isArray(details.stages) ? details.stages : []
      const names = ['Team', 'Season', 'Player']
      const text = names.map((name, i) => `${name} ${stages[i] === true ? '✓' : '✗'}`).join(' · ')
      return outcome === 'lost' ? `Out of lives · ${text}` : text
    },
    lives: ({ details }) => {
      const left = count(details.lives_left)
      return left === null ? null : { left, max: SHIRT_LIVES, icon: '🧤' }
    },
  },
}
