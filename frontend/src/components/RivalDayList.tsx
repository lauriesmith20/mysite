import { Link } from 'react-router-dom'
import ResultScore from './ResultScore'
import Lives from './Lives'
import type { DailyGameInfo } from '../lib/dailyGameRegistry'
import { formatPuzzleDay } from '../lib/dailyGames'
import type { RivalDay, RivalDayResult } from '../lib/gameScores'

function Result({
  game,
  result,
  hiddenLabel,
}: {
  game: DailyGameInfo
  result: RivalDayResult | null
  hiddenLabel: string
}) {
  if (!result) return <span className="text-[13px] font-semibold text-(--soft)">{hiddenLabel}</span>
  const lives = game.lives?.(result) ?? null
  const short = game.short?.(result)
  return (
    <div className="flex flex-col gap-1">
      <ResultScore game={game} result={result} className="gap-0.5 text-base" cellSize={14} />
      {lives && <Lives lives={lives.left} max={lives.max} size={12} icon={lives.icon} />}
      {short && <span className="text-[12px] font-extrabold text-(--soft)">{short}</span>}
    </div>
  )
}

function outcomeLine(
  day: RivalDay,
  friendName: string,
  pastes: boolean,
): { text: string; tone: 'win' | 'loss' | 'neutral' } {
  if (day.winner === 'me') return { text: `You won${day.decided_by ? ` on ${day.decided_by}` : ''}`, tone: 'win' }
  if (day.winner === 'them')
    return { text: `${friendName} won${day.decided_by ? ` on ${day.decided_by}` : ''}`, tone: 'loss' }
  if (day.winner === 'draw') return { text: 'Draw', tone: 'neutral' }
  if (!day.mine)
    return {
      text: day.their_played
        ? pastes
          ? "Paste today's result to see how they did"
          : "Finish today's puzzle to see how they did"
        : 'Not played yet',
      tone: 'neutral',
    }
  return { text: `Waiting for ${friendName}`, tone: 'neutral' }
}

const TONE = {
  win: 'bg-[#4CB87B] text-[#0E2A1B]',
  loss: 'bg-[#EC4060] text-[#2A0A12]',
  neutral: 'bg-(--chip) text-(--ink)',
}

/** Day-by-day results of a daily-game rivalry. A friend's result only shows once you've finished that day. */
export default function RivalDayList({
  days,
  game,
  friendName,
  today,
  onReplay,
  concealed,
}: {
  days: RivalDay[]
  game: DailyGameInfo
  friendName: string
  /** Today's date (YYYY-MM-DD); with `onReplay`, today's decided day gets a "Replay" link. */
  today?: string
  onReplay?: () => void
  /** A day whose result is being revealed elsewhere on the page, so it mustn't show yet. */
  concealed?: string
}) {
  if (days.length === 0) {
    return (
      <p className="text-center text-(--soft)">
        {game.paste ? (
          <>No days yet. Paste today's result above and it'll show up here once you've both played.</>
        ) : (
          <>
            No days yet. Play today's puzzle{' '}
            <Link to={game.playPath} className="font-bold underline">
              in {game.title}
            </Link>{' '}
            and it'll show up here once you've both played.
          </>
        )}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2.5 text-left">
      {days.map((day) => {
        const hide = day.puzzle_date === concealed
        const outcome = hide
          ? { text: 'Revealing…', tone: 'neutral' as const }
          : outcomeLine(day, friendName, game.paste !== undefined)
        return (
          <li
            key={day.puzzle_date}
            className="flex flex-col gap-2.5 rounded-[18px] bg-(--card) p-3.5 shadow-(--card-shadow)"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-extrabold">{formatPuzzleDay(day.puzzle_date)}</span>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-extrabold ${TONE[outcome.tone]}`}>
                {outcome.text}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-(--soft)">You</span>
                <Result game={game} result={hide ? null : day.mine} hiddenLabel={hide ? 'Played ✓' : 'Not played'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="truncate text-[11px] font-bold text-(--soft)">{friendName}</span>
                <Result
                  game={game}
                  result={hide ? null : day.theirs}
                  hiddenLabel={day.their_played ? 'Played ✓' : 'Not played'}
                />
              </div>
            </div>
            {onReplay && day.winner !== null && day.puzzle_date === today && !hide && (
              <button
                type="button"
                onClick={onReplay}
                className="self-start text-[13px] font-extrabold text-(--soft) underline"
              >
                Replay reveal
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
