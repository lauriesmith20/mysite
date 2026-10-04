import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
import NewGameModal from '../components/NewGameModal'
import { useAuth } from '../components/AuthGate'
import { listFriends, type Friend } from '../lib/friends'
import { createGame, listGamesWithFriend, type Game } from '../lib/gameScores'

const ME_COLOR = '#EC4060'
const FRIEND_COLOR = '#4A5BE0'

function nameFor(friend: Friend) {
  return friend.nickname?.trim() || friend.display_name || friend.email
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return `${Math.floor(days / 7)} weeks ago`
}

function Bar({ mine, theirs }: { mine: number; theirs: number }) {
  return (
    <div className="flex h-2 gap-[3px] overflow-hidden rounded bg-(--chip)">
      <div style={{ flexGrow: mine, backgroundColor: ME_COLOR }} />
      <div style={{ flexGrow: theirs, backgroundColor: FRIEND_COLOR }} />
    </div>
  )
}

export default function GameScoresFriendPage() {
  const { friendId } = useParams<{ friendId: string }>()
  const id = Number(friendId)
  const { me } = useAuth()
  const [friend, setFriend] = useState<Friend | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    listFriends().then((friends) => setFriend(friends.find((f) => f.id === id) ?? null))
    listGamesWithFriend(id)
      .then(setGames)
      .finally(() => setLoading(false))
  }, [id])

  async function handleAddGame(name: string, imageUrl: string | null, isDaily: boolean) {
    const game = await createGame(id, name, imageUrl, isDaily)
    setGames((prev) => [...prev, game])
  }

  const friendName = friend ? nameFor(friend) : '…'
  const rows = games
    .map((game) => {
      const iAmCreator = game.creator.id === me.id
      return {
        game,
        mine: iAmCreator ? game.creator_score : game.opponent_score,
        theirs: iAmCreator ? game.opponent_score : game.creator_score,
      }
    })
    .sort((a, b) => (b.game.last_updated ?? '').localeCompare(a.game.last_updated ?? ''))
  const totalMine = rows.reduce((n, r) => n + r.mine, 0)
  const totalTheirs = rows.reduce((n, r) => n + r.theirs, 0)
  const leader =
    totalMine === totalTheirs ? 'All square' : totalMine > totalTheirs ? 'You lead' : `${friendName} leads`

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-10 pt-1 md:pt-6">
      <BackLink to="/game-scores" label="Back to friends" />
      <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight">Rivalry</h1>

      <section className="mt-4 flex flex-col gap-3 rounded-[28px] bg-(--card) p-5 shadow-(--card-shadow)">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-[22px] font-extrabold text-[#1b1220]"
              style={{ backgroundColor: ME_COLOR }}
              aria-hidden="true"
            >
              {(me.nickname || me.display_name || 'Y')[0]?.toUpperCase()}
            </span>
            <span className="max-w-full truncate text-[15px] font-extrabold">You</span>
          </div>
          <div className="shrink-0 whitespace-nowrap text-4xl font-extrabold leading-none tracking-tight">
            {totalMine} <span className="font-normal text-(--soft)">–</span> {totalTheirs}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-[22px] font-extrabold text-white"
              style={{ backgroundColor: FRIEND_COLOR }}
              aria-hidden="true"
            >
              {friendName[0]?.toUpperCase()}
            </span>
            <span className="max-w-full truncate text-[15px] font-extrabold">{friendName}</span>
          </div>
        </div>
        <div className="flex h-3 gap-[3px] overflow-hidden rounded-md">
          <div style={{ flexGrow: totalMine, backgroundColor: ME_COLOR }} />
          <div style={{ flexGrow: totalTheirs, backgroundColor: FRIEND_COLOR }} />
        </div>
        <p className="text-[13px] text-(--soft)">
          {games.length} game{games.length === 1 ? '' : 's'} · {leader}
        </p>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="rounded-full bg-(--ink) px-4 py-2 text-sm font-extrabold text-(--bg)">By game</h2>
        <span className="text-[13px] font-semibold text-(--soft)">Most recent first</span>
      </div>

      {loading ? (
        <p className="mt-4 text-(--soft)">Loading…</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {rows.map(({ game, mine, theirs }) => (
            <Link
              key={game.id}
              to={`/h2h-game/${game.id}`}
              className="flex flex-col gap-2 rounded-[20px] bg-(--card) px-4 py-3.5 shadow-(--card-shadow) transition active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[17px] font-extrabold">
                    {game.name}
                    {game.is_daily && (
                      <span className="ml-2 rounded-full bg-(--chip) px-2 py-0.5 align-middle text-[11px] font-bold text-(--soft)">
                        Daily
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-(--soft)">Last played {timeAgo(game.last_updated)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-extrabold">
                    {mine} – {theirs}
                  </span>
                  <span className="text-xs font-bold">
                    {mine === theirs ? 'All square' : mine > theirs ? 'You lead' : `${friendName} leads`}
                  </span>
                </div>
              </div>
              <Bar mine={mine} theirs={theirs} />
            </Link>
          ))}
          {rows.length === 0 && <p className="text-(--soft)">No games yet — add the first one.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
      >
        New game
      </button>

      {showModal && <NewGameModal onClose={() => setShowModal(false)} onCreate={handleAddGame} />}
    </main>
  )
}
