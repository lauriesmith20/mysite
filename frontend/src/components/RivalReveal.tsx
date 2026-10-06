import { useEffect, useRef, useState } from 'react'
import ScoreBurst from './ScoreBurst'

interface RivalRevealProps {
  outcome: 'me' | 'them' | 'draw'
  friendName: string
  /** What settled it, e.g. "lives" (null for a draw). */
  decidedBy: string | null
  /** Called once it has played out, or when tapped. */
  onDone: () => void
  /** Called as soon as it starts, so the caller can remember it has been shown. */
  onShown?: () => void
}

const STEP_MS = 800
const VERDICT_MS = 5000

/**
 * The reveal of a day's result once you've both played: a full-screen 3, 2, 1, then the verdict with
 * confetti if you won or red crosses if they did. People who prefer reduced motion get just the verdict.
 */
export default function RivalReveal({ outcome, friendName, decidedBy, onDone, onShown }: RivalRevealProps) {
  const [count, setCount] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3))

  // Held in refs so a parent re-render passing new functions can't restart the countdown.
  const doneRef = useRef(onDone)
  const shownRef = useRef(onShown)
  useEffect(() => {
    doneRef.current = onDone
    shownRef.current = onShown
  })

  useEffect(() => {
    shownRef.current?.()
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      count === 0 ? () => doneRef.current() : () => setCount((c) => c - 1),
      count === 0 ? VERDICT_MS : STEP_MS,
    )
    return () => clearTimeout(timer)
  }, [count])

  const verdict =
    outcome === 'me'
      ? { emoji: '🎉', title: 'You won!', tone: 'text-[#8DE0A9]' }
      : outcome === 'them'
        ? { emoji: '😬', title: `${friendName} won`, tone: 'text-[#FF8FA3]' }
        : { emoji: '🤝', title: "It's a draw", tone: 'text-white' }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/75 px-6 text-center"
      role="dialog"
      aria-label="Today's result"
      aria-live="assertive"
      onClick={onDone}
    >
      {count > 0 ? (
        <span
          key={count}
          className="reveal-pop text-[10rem] font-extrabold leading-none text-white"
          aria-label={String(count)}
        >
          {count}
        </span>
      ) : (
        <div key="verdict" className="reveal-pop flex flex-col items-center gap-3">
          <span className="text-7xl" aria-hidden="true">
            {verdict.emoji}
          </span>
          <span className={`text-5xl font-extrabold ${verdict.tone}`}>{verdict.title}</span>
          {decidedBy && outcome !== 'draw' && <span className="text-lg font-bold text-white/80">on {decidedBy}</span>}
          <span className="mt-4 text-sm font-semibold text-white/60">Tap to close</span>
        </div>
      )}
      {count === 0 && outcome !== 'draw' && <ScoreBurst kind={outcome === 'me' ? 'confetti' : 'miss'} big />}
    </div>
  )
}
