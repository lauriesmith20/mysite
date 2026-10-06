// Rules for the daily Country Hopper game. Pure functions only (no imports), so they can be run and
// tested outside the browser. Countries are indexes into the world's country list; `adjacency[i]`
// lists the indexes sharing a land border with `i`.

export type Adjacency = number[][]

export const MAX_LIVES = 3
export const MAX_SUITCASES = 5
/** Routes get more slack the longer they are: the allowance step is 1 + floor(shortest / this). */
export const SCALING_FACTOR = 5
/** The daily pair is always this many borders apart, at least and at most. */
export const MIN_BORDERS = 4
export const MAX_BORDERS = 8
/** Puzzle #1; the number only appears in the share text. */
export const LAUNCH_DATE = '2026-10-06'

// ── Daily puzzle ─────────────────────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD: the puzzle changes at the player's midnight, like Wordle. */
export function dateKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function puzzleNumber(key: string): number {
  const days = (Date.parse(`${key}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`)) / 86_400_000
  return Math.max(1, Math.round(days) + 1)
}

function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function bfsDistances(adjacency: Adjacency, source: number): number[] {
  const dist = new Array<number>(adjacency.length).fill(-1)
  dist[source] = 0
  const queue = [source]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    for (const next of adjacency[current]) {
      if (dist[next] === -1) {
        dist[next] = dist[current] + 1
        queue.push(next)
      }
    }
  }
  return dist
}

export interface Puzzle {
  start: number
  end: number
  /** Fewest borders between them. */
  shortest: number
}

/**
 * The same pair for everyone on a given date: a seeded shuffle picks the start, then the end is a
 * random country MIN_BORDERS..MAX_BORDERS borders away on the same landmass. Returns null only if
 * the graph has no such pair at all.
 */
export function pickDailyPuzzle(adjacency: Adjacency, key: string): Puzzle | null {
  const random = mulberry32(hashString(`country-hopper:${key}`))
  const starts = adjacency.map((_, i) => i).filter((i) => adjacency[i].length > 0)
  for (let i = starts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[starts[i], starts[j]] = [starts[j], starts[i]]
  }
  for (const start of starts) {
    const dist = bfsDistances(adjacency, start)
    const ends = dist.flatMap((d, i) => (d >= MIN_BORDERS && d <= MAX_BORDERS ? [i] : []))
    if (ends.length > 0) {
      const end = ends[Math.floor(random() * ends.length)]
      return { start, end, shortest: dist[end] }
    }
  }
  return null
}

// ── Guessing and scoring ─────────────────────────────────────────────────────

export type GuessOutcome =
  | 'hop' // borders where you are: the route continues
  | 'win' // borders where you are and is the destination
  | 'repeat' // already on your route: ignored, costs nothing
  | 'invalid' // doesn't border where you are: costs a life

/** `path` starts at the start country and ends wherever the player has got to. */
export function judgeGuess(adjacency: Adjacency, path: number[], end: number, guess: number): GuessOutcome {
  if (path.includes(guess)) return 'repeat'
  if (!adjacency[path[path.length - 1]].includes(guess)) return 'invalid'
  return guess === end ? 'win' : 'hop'
}

/** How many extra borders each suitcase of slack allows for a puzzle of this length. */
export function allowanceStep(shortest: number): number {
  return 1 + Math.floor(shortest / SCALING_FACTOR)
}

/**
 * Suitcases for a finished route of `borders` borders: 5 for a shortest route, then one fewer per
 * `allowanceStep` of extra length, never below 1 for finishing at all.
 */
export function suitcasesFor(shortest: number, borders: number): number {
  const extra = borders - shortest
  if (extra <= 0) return MAX_SUITCASES
  return Math.max(1, MAX_SUITCASES - Math.ceil(extra / allowanceStep(shortest)))
}

/**
 * The shortest route that shares the most countries with what the player actually travelled, so the
 * result map highlights how close they were. Ties go to the lowest country index (deterministic).
 */
export function closestShortestRoute(adjacency: Adjacency, start: number, end: number, travelled: number[]): number[] {
  const fromStart = bfsDistances(adjacency, start)
  const toEnd = bfsDistances(adjacency, end)
  const length = fromStart[end]
  if (length < 0) return []
  const visited = new Set(travelled)
  const memo = new Map<number, { score: number; next: number | null }>()

  const best = (node: number): { score: number; next: number | null } => {
    const cached = memo.get(node)
    if (cached) return cached
    const own = visited.has(node) ? 1 : 0
    let result: { score: number; next: number | null } = { score: own, next: null }
    if (node !== end) {
      result = { score: -1, next: null }
      for (const next of [...adjacency[node]].sort((a, b) => a - b)) {
        if (fromStart[next] === fromStart[node] + 1 && fromStart[next] + toEnd[next] === length) {
          const score = own + best(next).score
          if (score > result.score) result = { score, next }
        }
      }
    }
    memo.set(node, result)
    return result
  }

  const route = [start]
  for (let node: number | null = best(start).next; node !== null; node = best(node).next) route.push(node)
  return route
}

// ── Typing a country name ────────────────────────────────────────────────────

/** Lower case, accents and punctuation removed: "Côte d'Ivoire" and "cote d ivoire" compare equal. */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface Candidate {
  id: number
  label: string
  /** Normalised names this country answers to (label, Natural Earth name, aliases). */
  terms: string[]
}

/** Best matches first: name starts with the text, then a word starts with it, then it appears anywhere. */
export function suggest(candidates: Candidate[], query: string, limit = 6): Candidate[] {
  const q = normalise(query)
  if (!q) return []
  const scored: { candidate: Candidate; rank: number }[] = []
  for (const candidate of candidates) {
    let rank = 4
    for (const term of candidate.terms) {
      if (term === q) rank = Math.min(rank, 0)
      else if (term.startsWith(q)) rank = Math.min(rank, 1)
      else if (term.split(' ').some((word) => word.startsWith(q))) rank = Math.min(rank, 2)
      else if (term.includes(q)) rank = Math.min(rank, 3)
    }
    if (rank < 4) scored.push({ candidate, rank })
  }
  scored.sort((a, b) => a.rank - b.rank || a.candidate.label.localeCompare(b.candidate.label))
  return scored.slice(0, limit).map((s) => s.candidate)
}

// ── Sharing ──────────────────────────────────────────────────────────────────

/** Wordle-style, spoiler-free: how many suitcases you earned, how many lives you kept, and a link. */
export function shareText(opts: { number: number; suitcases: number; livesLeft: number; url: string }): string {
  const suitcases = '🧳'.repeat(opts.suitcases) + '⬜'.repeat(MAX_SUITCASES - opts.suitcases)
  const lives = '❤️'.repeat(opts.livesLeft) + '❌'.repeat(MAX_LIVES - opts.livesLeft)
  return `Country Hopper #${opts.number}\n${suitcases}\n${lives}\n${opts.url}`
}
