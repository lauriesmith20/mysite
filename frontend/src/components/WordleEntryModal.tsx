import { useMemo, useState } from 'react'
import type { DailyGameInfo } from '../lib/dailyGameRegistry'
import {
  formatPuzzleDay,
  localDateKey,
  serverReason,
  type DailyGameResult,
  type DailyResultInput,
} from '../lib/dailyGames'
import { buildWordleResult, wordleNumber } from '../lib/wordle'

/** Someone a result can be entered for, and how to save it. */
export interface EntryTarget {
  label: string
  save: (input: DailyResultInput) => Promise<DailyGameResult>
}

const GUESSES = 6
const DAYS_BACK = 6
const SQUARES = Array.from({ length: GUESSES }, (_, i) => i + 1)

function recentDays(): string[] {
  return Array.from({ length: DAYS_BACK + 1 }, (_, back) => {
    const date = new Date()
    date.setDate(date.getDate() - back)
    return localDateKey(date)
  })
}

function dayLabel(day: string, index: number): string {
  return index === 0 ? 'Today' : index === 1 ? 'Yesterday' : formatPuzzleDay(day)
}

/** What a square looks like: filled in up to the guess you tapped (yellow tries, then the green win), or all grey. */
function squareStyle(n: number, picked: number | 'failed' | null): string {
  if (picked === null) return 'bg-(--chip) text-(--soft)'
  if (picked === 'failed') return 'bg-[#787C7E] text-white'
  if (n < picked) return 'bg-[#C9B458] text-white'
  if (n === picked) return 'bg-[#6AAA64] text-white'
  return 'bg-(--chip) text-(--soft)'
}

/**
 * Enter a Wordle result by hand: pick whose it is and which day, then tap the square for how many guesses it took
 * (or "didn't get it"). Only the number of guesses is needed.
 */
export default function WordleEntryModal({
  game,
  targets,
  onClose,
  onRecorded,
}: {
  game: DailyGameInfo
  targets: EntryTarget[]
  onClose: () => void
  onRecorded: (stored: DailyGameResult) => void
}) {
  const days = useMemo(() => recentDays(), [])
  const [target, setTarget] = useState(0)
  const [day, setDay] = useState(days[0])
  const [picked, setPicked] = useState<number | 'failed' | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const attempts = typeof picked === 'number' ? picked : null
  const points = attempts === null ? 0 : GUESSES + 1 - attempts

  function choose(next: number | 'failed') {
    setPicked(next)
    setStatus(null)
  }

  async function save() {
    if (picked === null || busy) return
    setBusy(true)
    setStatus(null)
    try {
      const input = buildWordleResult(day, attempts)
      const stored = await targets[target].save(input)
      const same = stored.score === input.score && stored.outcome === input.outcome
      setStatus({
        kind: 'ok',
        text: same
          ? `Saved for ${targets[target].label}: ${formatPuzzleDay(day)}, ${attempts === null ? 'not solved' : `${attempts}/6`}.`
          : `${targets[target].label === 'You' ? 'You already have' : `${targets[target].label} already has`} a result for ${formatPuzzleDay(day)}: the first one stands.`,
      })
      onRecorded(stored)
      setPicked(null)
    } catch (error) {
      setStatus({ kind: 'error', text: serverReason(error) ?? 'Could not save that result. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-2 text-[14px] font-extrabold transition active:scale-[0.96] ${
      active ? 'bg-(--ink) text-(--bg)' : 'bg-(--chip) text-(--ink)'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-(--card) p-5 shadow-lg sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Enter a ${game.title} result`}
      >
        <h2 className="text-xl font-extrabold">Enter a {game.title} result</h2>

        {targets.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Whose result">
            {targets.map((t, i) => (
              <button key={t.label} type="button" className={chip(i === target)} onClick={() => setTarget(i)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold text-(--soft)">
          Which day?
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-11 rounded-full bg-(--chip) px-4 text-[15px] font-extrabold text-(--ink)"
          >
            {days.map((d, i) => (
              <option key={d} value={d}>
                {dayLabel(d, i)} (#{wordleNumber(d).toLocaleString('en-GB')})
              </option>
            ))}
          </select>
        </label>

        <p className="mt-5 text-center text-sm font-bold text-(--soft)">How many guesses did it take?</p>
        <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Number of guesses">
          {SQUARES.map((n, i) => (
            <button
              // A new key when the colour changes, so the square pops again (one after another, left to right).
              key={`${n}-${squareStyle(n, picked)}`}
              type="button"
              onClick={() => choose(n)}
              aria-pressed={picked === n}
              aria-label={`${n} ${n === 1 ? 'guess' : 'guesses'}`}
              style={{ animationDelay: `${i * 45}ms` }}
              className={`${picked === null ? '' : 'reveal-pop'} h-[52px] w-[52px] rounded-[8px] text-xl font-extrabold transition active:scale-90 ${squareStyle(n, picked)}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => choose('failed')}
            aria-pressed={picked === 'failed'}
            className={`rounded-full px-5 py-2 text-[14px] font-extrabold transition active:scale-[0.96] ${
              picked === 'failed' ? 'bg-[#E5484D] text-white' : 'bg-(--chip) text-(--ink)'
            }`}
          >
            ✗ Didn't get it
          </button>
        </div>

        <p className="mt-4 text-center text-[15px] font-extrabold" aria-live="polite">
          {picked === null
            ? 'Tap a square'
            : attempts === null
              ? 'Not solved · 0 points'
              : `${attempts}/6 · ${points} point${points === 1 ? '' : 's'}`}
        </p>
        <p
          className={`mt-1 min-h-5 text-center text-sm font-bold ${status?.kind === 'error' ? 'text-red-500' : 'text-(--soft)'}`}
          aria-live="polite"
        >
          {status?.text ?? ''}
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={picked === null || busy}
            className="h-[52px] flex-1 rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? 'Saving…' : targets.length > 1 ? `Save for ${targets[target].label}` : 'Save result'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-[52px] rounded-full bg-(--chip) px-5 text-[16px] font-extrabold text-(--ink) transition active:scale-[0.97]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
