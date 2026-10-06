import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Page from '../shared/layout/Page'
import Avatar from '../components/Avatar'
import { accountName, listFriends, type Friend } from '../lib/friends'
import { acceptChallenge, declineChallenge, listIncomingChallenges, type IncomingChallenge } from '../lib/gameScores'

function nameFor(friend: Friend) {
  return friend.nickname?.trim() || friend.display_name || friend.email
}

export default function GameScoresPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [challenges, setChallenges] = useState<IncomingChallenge[]>([])
  const [accepted, setAccepted] = useState<Set<number>>(new Set())

  useEffect(() => {
    listFriends()
      .then(setFriends)
      .finally(() => setLoading(false))
    listIncomingChallenges()
      .then(setChallenges)
      .catch(() => {})
  }, [])

  async function respond(challenge: IncomingChallenge, accept: boolean) {
    try {
      if (accept) {
        await acceptChallenge(challenge.id)
        setAccepted((prev) => new Set(prev).add(challenge.id))
      } else {
        await declineChallenge(challenge.id)
        setChallenges((prev) => prev.filter((c) => c.id !== challenge.id))
      }
    } catch {
      // leave the card in place so it can be tried again
    }
  }

  return (
    <Page title="🎲 H2H Games" subtitle="Pick who you're playing against.">
      {challenges.length > 0 && (
        <section className="mb-5 flex flex-col gap-3" aria-label="Challenges">
          {challenges.map((challenge) => {
            const name = accountName(challenge.challenger)
            return (
              <div key={challenge.id} className="flex flex-col gap-3 rounded-[22px] bg-(--chip) p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={name} color={challenge.challenger.avatar_color} />
                  <p className="text-[15px] font-bold">
                    {name} challenged you to {challenge.title}.
                  </p>
                </div>
                {accepted.has(challenge.id) ? (
                  <Link
                    to={`/game-scores/${challenge.challenger.id}`}
                    className="flex h-11 items-center justify-center rounded-full bg-(--ink) text-[15px] font-extrabold text-(--bg)"
                  >
                    Accepted: open the rivalry
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respond(challenge, true)}
                      className="h-11 flex-1 rounded-full bg-(--ink) text-[15px] font-extrabold text-(--bg) transition active:scale-[0.97]"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(challenge, false)}
                      className="h-11 flex-1 rounded-full bg-(--card) text-[15px] font-extrabold text-(--ink) transition active:scale-[0.97]"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

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
