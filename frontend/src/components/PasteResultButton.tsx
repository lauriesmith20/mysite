import { useState } from 'react'
import type { DailyGameInfo } from '../lib/dailyGameRegistry'
import { formatPuzzleDay, serverReason, submitResult, type DailyGameResult } from '../lib/dailyGames'

type Status = { kind: 'ok' | 'error'; text: string } | null

/**
 * A "paste" button, like a copy-result button the other way round, for games played elsewhere:
 * reads the clipboard, works out the result, and records it for the signed-in account.
 */
export default function PasteResultButton({
  game,
  onRecorded,
}: {
  game: DailyGameInfo
  onRecorded?: (result: DailyGameResult) => void
}) {
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const paste = game.paste
  if (!paste) return null

  async function handlePaste() {
    if (!paste || busy) return
    setStatus(null)
    let text: string | null
    try {
      text = await navigator.clipboard.readText()
    } catch {
      // Clipboard reading is blocked or unsupported here: let them paste into a box instead.
      text = window.prompt(`Paste your ${game.title} result:`)
    }
    if (text === null) return // cancelled

    const result = paste.parse(text)
    if (!result) {
      setStatus({ kind: 'error', text: paste.notDetected })
      return
    }
    setBusy(true)
    try {
      const stored = await submitResult(game.key, result)
      const day = formatPuzzleDay(result.puzzle_date)
      // The first result for a day is final, so pasting a different one later doesn't change it.
      const same = stored.score === result.score && stored.outcome === result.outcome
      setStatus({
        kind: 'ok',
        text: same ? `Recorded for ${day}.` : `Already recorded for ${day}: the first result stands.`,
      })
      onRecorded?.(stored)
    } catch (error) {
      setStatus({ kind: 'error', text: serverReason(error) ?? 'Could not save that result. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handlePaste}
        disabled={busy}
        className="h-[54px] w-full rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97] disabled:opacity-60"
      >
        {busy ? 'Saving…' : paste.buttonLabel}
      </button>
      <p
        className={`min-h-5 text-center text-sm font-bold ${status?.kind === 'error' ? 'text-red-500' : 'text-(--soft)'}`}
        aria-live="polite"
      >
        {status ? status.text : paste.hint}
      </p>
    </div>
  )
}
