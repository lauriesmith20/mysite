import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Page from '../shared/layout/Page'
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
    <Page
      title="🎲 H2H Games"
      subtitle="Pick who you're playing against."
    >
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
    </Page>
  )
}


