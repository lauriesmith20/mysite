import DailyScore from './DailyScore'
import type { DailyGameInfo, ScoreCell } from '../lib/dailyGameRegistry'

const COLOURS: Record<ScoreCell, string> = {
  green: '#6AAA64',
  yellow: '#C9B458',
  red: '#E5484D',
}

/**
 * How a result looks in compact views. Games that define `cells` (Wordle: a yellow square per miss, then
 * green for the solving guess, all red for a fail) show those; the rest show points as a row of icons.
 */
export default function ResultScore({
  game,
  result,
  className = 'gap-0.5 text-lg',
  cellSize = 16,
}: {
  game: DailyGameInfo
  result: { score: number; outcome: 'won' | 'lost'; details: Record<string, unknown> }
  /** Spacing and size for the icon row (points games). */
  className?: string
  /** Side length of a coloured square, in pixels. */
  cellSize?: number
}) {
  const cells = game.cells?.(result)
  if (!cells) {
    return (
      <DailyScore score={result.score} max={game.maxScore} icon={game.scoreIcon} label="points" className={className} />
    )
  }
  return (
    <div className="flex gap-1" role="img" aria-label={`${game.title} ${game.short?.(result) ?? ''}`.trim()}>
      {cells.map((cell, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="rounded-[3px]"
          style={{ width: cellSize, height: cellSize, backgroundColor: COLOURS[cell] }}
        />
      ))}
    </div>
  )
}
