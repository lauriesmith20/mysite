import type { DailyResultInput } from './dailyGames'

// Wordle is played on nytimes.com, which a page here can't read, so players paste their share text:
//
//   Wordle 1,935 4/6
//
//   ⬜⬜⬜⬜⬜
//   ⬜⬜⬜🟨⬜
//   ⬜🟨🟨⬜⬜
//   🟩🟩🟩🟩🟩
//
// This turns that into a result to record. It can't prove the text is genuine, only that it hangs
// together (and the server re-checks the same things).

const DAY_MS = 86_400_000
/** Wordle #0 was 19 June 2021, and the number goes up by one each day. */
const EPOCH = Date.UTC(2021, 5, 19)
const GUESSES = 6

/** The calendar date (YYYY-MM-DD) of a Wordle number. */
export function wordleDate(number: number): string {
  return new Date(EPOCH + number * DAY_MS).toISOString().slice(0, 10)
}

const SQUARES = new Set(['⬛', '⬜', '🟨', '🟩', '🟧', '🟦'])
// High-contrast mode swaps green/yellow for orange/blue; store them as the usual colours.
const STANDARD: Record<string, string> = { '🟧': '🟩', '🟦': '🟨' }

function isSolved(row: string[]): boolean {
  return row.every((square) => square === '🟩')
}

/** The result to record for pasted Wordle share text, or null if it isn't a (consistent) Wordle result. */
export function parseWordle(text: string): DailyResultInput | null {
  // Some copy paths add emoji variation selectors; they aren't part of the grid.
  const clean = text.replace(/️/g, '')
  const header = /Wordle\s+([\d.,  ]+?)\s+([1-6X])\/6(\*?)/i.exec(clean)
  if (!header) return null

  const number = Number(header[1].replace(/\D/g, ''))
  if (!Number.isInteger(number) || number < 1 || number > 100_000) return null
  const guessText = header[2].toUpperCase()
  const attempts = guessText === 'X' ? null : Number(guessText)

  const rows: string[][] = []
  for (const line of clean.slice(header.index + header[0].length).split(/\r?\n/)) {
    const squares = [...line.replace(/\s/g, '')]
    if (squares.length > 0 && squares.every((square) => SQUARES.has(square))) {
      if (squares.length !== 5) return null
      rows.push(squares.map((square) => STANDARD[square] ?? square))
    }
  }

  // One row per guess; a solved game ends on the first all-green row, a failed one never has one.
  const expectedRows = attempts ?? GUESSES
  if (rows.length !== expectedRows) return null
  if (rows.slice(0, -1).some(isSolved)) return null
  const lastSolved = isSolved(rows[rows.length - 1])
  if (attempts === null ? lastSolved : !lastSolved) return null

  return {
    puzzle_date: wordleDate(number),
    // 6 points for getting it in 1, down to 1 for 6, and 0 for a fail.
    score: attempts === null ? 0 : GUESSES + 1 - attempts,
    outcome: attempts === null ? 'lost' : 'won',
    details: {
      puzzle_number: number,
      attempts,
      hard_mode: header[3] === '*',
      grid: rows.map((row) => row.join('')),
    },
  }
}
