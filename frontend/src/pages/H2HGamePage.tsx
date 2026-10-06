import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Page from '../shared/layout/Page'
import { Settings, Trash2 } from 'lucide-react'
import {
  acceptChallenge,
  declineChallenge,
  deleteGame,
  getGame,
  getScoreHistory,
  hasUpdatedToday,
  listRivalDays,
  updateGame,
  updateScore,
  type Game,
  type RivalDay,
  type ScoreHistoryEntry,
} from '../lib/gameScores'
import { DAILY_GAMES } from '../lib/dailyGameRegistry'
import { hasSeenReveal, localDateKey, markRevealSeen } from '../lib/dailyGames'
import EditGameModal from '../components/EditGameModal'
import PasteResultButton from '../components/PasteResultButton'
import RivalDayList from '../components/RivalDayList'
import RivalReveal from '../components/RivalReveal'
import ScoreBar from '../components/ScoreBar'
import ScoreBurst from '../components/ScoreBurst'
import { useAuth } from '../shared/auth/AuthGate'

function nameFor(account: { nickname: string | null; display_name: string | null; email: string }) {
  return account.nickname?.trim() || account.display_name || account.email
}

export default function H2HGamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { me } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  // Briefly locks the +1 buttons after a tap so a double tap can't score twice.
  const [cooling, setCooling] = useState(false)
  // `key` changes per score so the effect restarts even when the same player scores twice running.
  const [burst, setBurst] = useState<{ key: number; playerId: number } | null>(null)
  // Day-by-day results, for rivalries over a built-in daily game.
  const [days, setDays] = useState<RivalDay[] | null>(null)
  // The 3-2-1 reveal of today's result: plays the first time you see it decided, or when replayed.
  const [revealDone, setRevealDone] = useState(false)
  const [replaying, setReplaying] = useState(false)

  useEffect(() => {
    if (id) getGame(Number(id)).then(setGame)
  }, [id])

  const isLiveRivalry = game?.daily_game_key != null && game.challenge_status === 'accepted'
  useEffect(() => {
    if (id && isLiveRivalry)
      listRivalDays(Number(id))
        .then(setDays)
        .catch(() => setDays([]))
  }, [id, isLiveRivalry])

  useEffect(() => {
    if (id) getScoreHistory(Number(id)).then(setHistory)
  }, [id])

  async function handleScore(playerId: number) {
    if (!id || cooling) return
    setCooling(true)
    setTimeout(() => setCooling(false), 1000)
    setError(null)
    try {
      const updated = await updateScore(Number(id), playerId)
      setGame(updated)
      setBurst((prev) => ({ key: (prev?.key ?? 0) + 1, playerId }))
      setHistory(await getScoreHistory(Number(id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score.')
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
    navigate(`/game-scores/${friendId}`)
  }

  async function handleAccept() {
    if (!id) return
    setError(null)
    try {
      setGame(await acceptChallenge(Number(id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept the challenge.')
    }
  }

  async function handleDecline() {
    if (!id) return
    setError(null)
    try {
      await declineChallenge(Number(id))
      navigate(`/game-scores/${friendId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline the challenge.')
    }
  }

  async function handleEndRivalry() {
    if (window.confirm('End this rivalry? Your daily results are kept, but the head-to-head tally is removed.')) {
      await handleDelete()
    }
  }

  if (!game) {
    return (
      <Page back={{ to: '/game-scores', label: 'Back to games' }}>
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      </Page>
    )
  }

  // Rivalries over a built-in daily game: scores count days won and come from the daily results.
  const daily = game.daily_game_key !== null ? DAILY_GAMES[game.daily_game_key] : undefined
  const isChallenge = game.daily_game_key !== null
  const pendingChallenge = isChallenge && game.challenge_status === 'pending'
  const today = localDateKey()
  const todayDecided = days?.find((day) => day.puzzle_date === today && day.winner !== null)
  const showReveal = isLiveRivalry && todayDecided && !revealDone && (replaying || !hasSeenReveal(game.id, today))
  const locked = !isChallenge && game.is_daily && hasUpdatedToday(game)
  const friendId = game.creator.id === me.id ? game.opponent.id : game.creator.id
  // You are always on the left, whichever side of the game you were stored as.
  // While today's result is being revealed, the tally holds back the point it will award.
  const concealing = showReveal ? todayDecided?.winner : null
  const iAmCreator = game.creator.id === me.id
  const sides = [
    {
      player: game.creator,
      score: Math.max(0, game.creator_score - (concealing === (iAmCreator ? 'me' : 'them') ? 1 : 0)),
    },
    {
      player: game.opponent,
      score: Math.max(0, game.opponent_score - (concealing === (iAmCreator ? 'them' : 'me') ? 1 : 0)),
    },
  ]
  if (game.opponent.id === me.id) sides.reverse()

  return (
    <Page
      title={game.name}
      back={{ to: `/game-scores/${friendId}`, label: 'Back to games' }}
      actions={
        isChallenge ? (
          <button
            onClick={handleEndRivalry}
            aria-label="End rivalry"
            className="p-2 text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit game"
            className="p-2 text-gray-400 transition hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        )
      }
      contentClassName="text-center"
    >
      {showReveal && todayDecided && todayDecided.winner && (
        <RivalReveal
          outcome={todayDecided.winner}
          friendName={nameFor(game.creator.id === me.id ? game.opponent : game.creator)}
          decidedBy={todayDecided.decided_by}
          onShown={() => markRevealSeen(game.id, today)}
          onDone={() => {
            setRevealDone(true)
            setReplaying(false)
            getGame(game.id).then(setGame)
          }}
        />
      )}
      {game.image_url && (
        <img src={game.image_url} alt={game.name} className="mx-auto mb-6 h-40 w-40 rounded-xl object-cover" />
      )}
      {game.is_daily && !isChallenge && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {locked ? 'Already played today. Come back tomorrow!' : 'Daily game — one update per day'}
        </p>
      )}
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {pendingChallenge && (
        <section className="flex flex-col gap-3 rounded-[22px] bg-(--chip) p-5 text-left">
          <p className="text-[16px] font-bold">
            {game.opponent.id === me.id
              ? `${nameFor(game.creator)} challenged you to ${game.name}.`
              : `Waiting for ${nameFor(game.opponent)} to accept your ${game.name} challenge.`}
          </p>
          <p className="text-[13px] text-(--soft)">
            You'd each play the same puzzle every day, and the better result wins the day: most suitcases, then most
            lives, then fewest hops. It counts from the day it's accepted, including today.
          </p>
          <div className="flex gap-2">
            {game.opponent.id === me.id ? (
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="h-11 flex-1 rounded-full bg-(--ink) text-[15px] font-extrabold text-(--bg) transition active:scale-[0.97]"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="h-11 flex-1 rounded-full bg-(--card) text-[15px] font-extrabold text-(--ink) transition active:scale-[0.97]"
                >
                  Decline
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                className="h-11 flex-1 rounded-full bg-(--card) text-[15px] font-extrabold text-(--ink) transition active:scale-[0.97]"
              >
                Cancel challenge
              </button>
            )}
          </div>
        </section>
      )}
      {!pendingChallenge && (
        <div className="grid grid-cols-2 gap-6">
          {sides.map(({ player, score }) => {
            const isMe = player.id === me.id
            return (
              <div key={player.id} className="relative flex flex-col items-center gap-4">
                <h2 className="text-lg font-semibold">{isMe ? 'You' : nameFor(player)}</h2>
                <p className="text-5xl font-bold">{score}</p>
                {isChallenge ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">days won</p>
                ) : (
                  <button
                    onClick={() => handleScore(player.id)}
                    disabled={locked || cooling}
                    className="rounded-lg border border-gray-200 px-6 py-2 text-lg font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    +1
                  </button>
                )}
                {burst?.playerId === player.id && <ScoreBurst key={burst.key} kind={isMe ? 'confetti' : 'miss'} />}
              </div>
            )
          })}
        </div>
      )}
      {!pendingChallenge && (
        <ScoreBar mine={sides[0].score} theirs={sides[1].score} className="mx-auto mt-5 h-3 max-w-xs" />
      )}
      {isLiveRivalry && daily?.paste && (
        <div className="mt-8">
          <PasteResultButton
            game={daily}
            onRecorded={() => {
              // A new result can decide the day, so refresh the tally as well as the day list.
              getGame(Number(id)).then(setGame)
              listRivalDays(Number(id))
                .then(setDays)
                .catch(() => {})
            }}
          />
        </div>
      )}
      {isLiveRivalry && (
        <div className="mt-8">
          <h2 className="mb-3 text-left text-lg font-semibold">Day by day</h2>
          {daily && days ? (
            <RivalDayList
              days={days}
              game={daily}
              friendName={nameFor(game.creator.id === me.id ? game.opponent : game.creator)}
              today={today}
              concealed={showReveal ? today : undefined}
              onReplay={() => {
                setRevealDone(false)
                setReplaying(true)
              }}
            />
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">
              {days ? "This game isn't available." : 'Loading…'}
            </p>
          )}
          {daily && (
            <Link
              to={`/games/${daily.key}/history`}
              className="mt-4 flex h-[48px] items-center justify-center rounded-full bg-(--chip) text-[16px] font-extrabold text-(--ink) transition active:scale-[0.97]"
            >
              Score history
            </Link>
          )}
        </div>
      )}
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
                      {entry.player_id === game.creator.id ? nameFor(game.creator) : nameFor(game.opponent)}{' '}
                      {entry.delta >= 0 ? '+' : ''}
                      {entry.delta} → {entry.resulting_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && !isChallenge && (
        <EditGameModal game={game} onClose={() => setEditing(false)} onSave={handleSave} onDelete={handleDelete} />
      )}
    </Page>
  )
}
