import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import {
  deleteGame,
  getGame,
  getScoreHistory,
  hasUpdatedToday,
  updateGame,
  updateScore,
  type Game,
  type ScoreHistoryEntry,
} from '../lib/gameScores'
import EditGameModal from '../components/EditGameModal'

export default function H2HGamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (id) getGame(Number(id)).then(setGame)
  }, [id])

  useEffect(() => {
    if (id) getScoreHistory(Number(id)).then(setHistory)
  }, [id])

  async function handleScore(player: 'laurie' | 'maeve') {
    if (!id) return
    setError(null)
    try {
      const updated = await updateScore(Number(id), player)
      setGame(updated)
      setHistory(await getScoreHistory(Number(id)))
    } catch {
      setError('Score already updated today for this daily game.')
    }
  }

  async function handleSave(updates: { image_url: string | null; is_daily: boolean }) {
    if (!id) return
    const updated = await updateGame(Number(id), updates)
    setGame(updated)
  }

  async function handleDelete() {
    if (!id) return
    await deleteGame(Number(id))
    navigate('/game-scores')
  }

  if (!game) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    )
  }

  const locked = game.is_daily && hasUpdatedToday(game)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-center">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/game-scores"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to games
        </Link>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit game"
          className="text-gray-400 transition hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {game.image_url && (
        <img
          src={game.image_url}
          alt={game.name}
          className="mx-auto mb-6 h-40 w-40 rounded-xl object-cover"
        />
      )}
      <h1 className="mb-2 text-3xl font-bold">{game.name}</h1>
      {game.is_daily && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {locked ? 'Already played today. Come back tomorrow!' : 'Daily game — one update per day'}
        </p>
      )}
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Laurie</h2>
          <p className="text-5xl font-bold">{game.laurie_score}</p>
          <button
            onClick={() => handleScore('laurie')}
            disabled={locked}
            className="rounded-lg border border-gray-200 px-6 py-2 text-lg font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            +1
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold">Maeve</h2>
          <p className="text-5xl font-bold">{game.maeve_score}</p>
          <button
            onClick={() => handleScore('maeve')}
            disabled={locked}
            className="rounded-lg border border-gray-200 px-6 py-2 text-lg font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            +1
          </button>
        </div>
      </div>
      {history.length > 0 && (
        <div className="mt-10 text-left">
          <h2 className="mb-3 text-lg font-semibold">History</h2>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Who</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">When</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Change</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2">{entry.changed_by}</td>
                    <td className="px-4 py-2">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {entry.player === 'laurie' ? 'Laurie' : 'Maeve'} {entry.delta >= 0 ? '+' : ''}
                      {entry.delta} → {entry.resulting_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && (
        <EditGameModal
          game={game}
          onClose={() => setEditing(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </main>
  )
}

