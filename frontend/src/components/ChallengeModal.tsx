import { useState } from 'react'
import { DAILY_GAMES } from '../lib/dailyGameRegistry'

interface ChallengeModalProps {
  friendName: string
  /** Daily games that already have a challenge or rivalry with this friend. */
  taken: Set<string>
  onClose: () => void
  onChallenge: (dailyGameKey: string) => Promise<void>
}

/** Pick one of the built-in daily games to challenge a friend to. They have to accept before it counts. */
export default function ChallengeModal({ friendName, taken, onClose, onChallenge }: ChallengeModalProps) {
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(key: string) {
    if (sending) return
    setSending(key)
    setError(null)
    try {
      await onChallenge(key)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the challenge.')
      setSending(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[24px] bg-(--card) p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Challenge to a daily game"
      >
        <h2 className="text-xl font-extrabold">Challenge {friendName}</h2>
        <p className="mt-1 text-sm text-(--soft)">
          Pick a daily game. Once {friendName} accepts, you each play the same puzzle every day and the better result
          wins that day. It counts from the day they accept, including today.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {Object.values(DAILY_GAMES).map((game) => {
            const already = taken.has(game.key)
            return (
              <li key={game.key}>
                <button
                  type="button"
                  disabled={already || sending !== null}
                  onClick={() => choose(game.key)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-(--chip) px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {game.scoreIcon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-extrabold">{game.title}</span>
                    <span className="block text-xs font-semibold text-(--soft)">
                      {already ? 'Already challenged' : sending === game.key ? 'Sending…' : 'Daily rivalry'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-full bg-(--chip) text-[15px] font-extrabold text-(--ink)"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
