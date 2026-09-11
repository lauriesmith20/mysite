import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import GameTile from '../components/GameTile'
import NewGameModal from '../components/NewGameModal'
import NewGameTile from '../components/NewGameTile'
import { listFriends, type Friend } from '../lib/friends'
import { createGame, listGamesWithFriend, type Game } from '../lib/gameScores'

function nameFor(friend: Friend) {
  return friend.nickname?.trim() || friend.display_name || friend.email
}

export default function GameScoresFriendPage() {
  const { friendId } = useParams<{ friendId: string }>()
  const id = Number(friendId)
  const [friend, setFriend] = useState<Friend | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    listFriends().then((friends) => setFriend(friends.find((f) => f.id === id) ?? null))
    listGamesWithFriend(id)
      .then(setGames)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleAddGame(name: string, imageUrl: string | null, isDaily: boolean) {
    const game = await createGame(id, name, imageUrl, isDaily)
    setGames((prev) => [...prev, game])
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        to="/game-scores"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to friends
      </Link>
      <h1 className="mb-8 text-3xl font-bold">H2H vs {friend ? nameFor(friend) : '…'}</h1>
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
