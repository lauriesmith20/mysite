import { useEffect, useState } from 'react'
import GameTile from '../components/GameTile'
import NewGameModal from '../components/NewGameModal'
import NewGameTile from '../components/NewGameTile'
import { createGame, listGames, type Game } from '../lib/gameScores'

export default function GameScoresPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    listGames()
      .then(setGames)
      .finally(() => setLoading(false))
  }, [])

  async function handleAddGame(name: string, imageUrl: string | null, isDaily: boolean) {
    const game = await createGame(name, imageUrl, isDaily)
    setGames((prev) => [...prev, game])
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">H2H: Maeve vs Laurie</h1>
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {games.map((game) => (
            <GameTile key={game.id} game={game} />
          ))}
          <NewGameTile onClick={() => setShowModal(true)} />
        </div>
      )}

      {showModal && <NewGameModal onClose={() => setShowModal(false)} onCreate={handleAddGame} />}
    </main>
  )
}

