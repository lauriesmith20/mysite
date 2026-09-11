import { Link } from 'react-router-dom'
import type { Game } from '../lib/gameScores'
import { useAuth } from './AuthGate'

function nameFor(account: { nickname: string | null; display_name: string | null; email: string }) {
  return account.nickname?.trim() || account.display_name || account.email
}

export default function GameTile({ game }: { game: Game }) {
  const { me } = useAuth()
  const youAreCreator = game.creator.id === me.id
  const leftLabel = youAreCreator ? 'You' : nameFor(game.creator)
  const rightLabel = youAreCreator ? nameFor(game.opponent) : 'You'

  return (
    <Link
      to={`/h2h-game/${game.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
    >
      <div className="relative flex h-32 items-center justify-center bg-gray-100 dark:bg-gray-900">
        {game.image_url ? (
          <img src={game.image_url} alt={game.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🎲
          </span>
        )}
        {game.is_daily && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            Daily
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold">{game.name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {leftLabel} {game.creator_score} – {rightLabel} {game.opponent_score}
        </p>
      </div>
    </Link>
  )
}
