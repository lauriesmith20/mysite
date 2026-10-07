import { useState } from 'react'
import type { DailyGameInfo } from '../lib/dailyGameRegistry'
import type { DailyGameResult } from '../lib/dailyGames'
import WordleEntryModal, { type EntryTarget } from './WordleEntryModal'

/**
 * "Enter result manually", for games played elsewhere (Wordle): opens a screen where you tap in the squares, for
 * yourself or (on a rivalry page) for the other player. Next to the paste button, as the way in when pasting isn't
 * possible, or for someone who just told you their score.
 */
export default function ManualResultButton({
  game,
  targets,
  onRecorded,
}: {
  game: DailyGameInfo
  targets: EntryTarget[]
  onRecorded?: (stored: DailyGameResult) => void
}) {
  const [open, setOpen] = useState(false)
  if (!game.paste) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-[48px] w-full rounded-full bg-(--chip) text-[16px] font-extrabold text-(--ink) transition active:scale-[0.97]"
      >
        Enter result manually
      </button>
      {open && (
        <WordleEntryModal
          game={game}
          targets={targets}
          onClose={() => setOpen(false)}
          onRecorded={(stored) => onRecorded?.(stored)}
        />
      )}
    </>
  )
}
