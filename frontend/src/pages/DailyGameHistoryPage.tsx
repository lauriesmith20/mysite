import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ResultScore from '../components/ResultScore'
import Lives from '../components/Lives'
import PasteResultButton from '../components/PasteResultButton'
import { DAILY_GAMES } from '../lib/dailyGameRegistry'
import { formatPuzzleDay, listResults, playStats, type DailyGameResult } from '../lib/dailyGames'
import Page from '../shared/layout/Page'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[20px] bg-(--card) px-2 py-3.5 text-center shadow-(--card-shadow)">
      <span className="text-[26px] font-extrabold leading-none">{value}</span>
      <span className="text-[12px] font-bold text-(--soft)">{label}</span>
    </div>
  )
}

/** Your results for any once-a-day game (see lib/dailyGameRegistry.ts), newest first, with streaks. */
export default function DailyGameHistoryPage() {
  const { gameKey = '' } = useParams<{ gameKey: string }>()
  const game = DAILY_GAMES[gameKey]
  const [results, setResults] = useState<DailyGameResult[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!game) return
    listResults(game.key)
      .then(setResults)
      .catch(() => setError(true))
  }, [game])

  const stats = useMemo(() => (results ? playStats(results) : null), [results])
  const average = useMemo(
    () =>
      (game && results && game.averageStat?.(results)) || {
        value: stats ? stats.averageScore.toFixed(1) : '',
        label: `Avg out of ${game?.maxScore ?? ''}`,
      },
    [game, results, stats],
  )

  if (!game) {
    return (
      <Page title="Score history">
        <p className="text-(--soft)">That game doesn't keep a score history.</p>
      </Page>
    )
  }

  return (
    <Page
      title="Score history"
      subtitle={game.title}
      subtitleClassName="text-sm"
      back={game.home}
      contentClassName="flex flex-col gap-4"
    >
      {game.paste && (
        <PasteResultButton
          game={game}
          onRecorded={() =>
            listResults(game.key)
              .then(setResults)
              .catch(() => {})
          }
        />
      )}
      {error ? (
        <p className="text-(--soft)">Couldn't load your results. Try again later.</p>
      ) : !results || !stats ? (
        <p className="text-(--soft)">Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-(--soft)">
          {game.paste ? (
            <>Nothing here yet. Paste today's result above and it'll show up.</>
          ) : (
            <>
              Nothing here yet.{' '}
              <Link to={game.playPath} className="font-bold underline">
                Play today's puzzle
              </Link>{' '}
              and your result will show up.
            </>
          )}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat value={String(stats.played)} label="Played" />
            <Stat value={average.value} label={average.label} />
            <Stat value={String(stats.currentStreak)} label={`Streak (best ${stats.bestStreak})`} />
          </div>

          <ul className="flex flex-col gap-2">
            {results.map((result) => {
              const detail = game.describe(result)
              const lives = game.lives?.(result) ?? null
              return (
                <li
                  key={result.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] bg-(--card) px-4 py-3 shadow-(--card-shadow)"
                >
                  <div className="min-w-0">
                    <span className="block text-[15px] font-extrabold">{formatPuzzleDay(result.puzzle_date)}</span>
                    {detail && <span className="block text-[13px] font-semibold text-(--soft)">{detail}</span>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ResultScore game={game} result={result} className="gap-0.5 text-lg" />
                    {lives && <Lives lives={lives.left} max={lives.max} size={14} />}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Page>
  )
}
