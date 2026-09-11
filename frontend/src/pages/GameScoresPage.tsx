import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { listFriends, type Friend } from '../lib/friends'

function nameFor(friend: Friend) {
  return friend.nickname?.trim() || friend.display_name || friend.email
}

export default function GameScoresPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listFriends()
      .then(setFriends)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back home
      </Link>
      <h1 className="mb-2 text-3xl font-bold">🎲 H2H Games</h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">Pick who you're playing against.</p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          You don't have any friends yet — add some from your{' '}
          <Link to="/profile" className="underline">
            profile
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/game-scores/${friend.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
            >
              <Avatar name={nameFor(friend)} color={friend.avatar_color} />
              <span className="font-medium">{nameFor(friend)}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}


