import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Beer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import CashOutModal from '../components/CashOutModal'
import NewBetModal from '../components/NewBetModal'
import { useAuth } from '../components/AuthGate'
import {
  cancelBet,
  cashOut,
  confirmBet,
  confirmWinner,
  createBet,
  disputeWinner,
  getSummaryWithFriend,
  listBetsWithFriend,
  resolveBet,
  type BeerBet,
  type BeerBetSummary,
} from '../lib/beerBets'
import { listFriends, type Friend } from '../lib/friends'

const statusStyles: Record<BeerBet['status'], string> = {
  awaiting_confirmation: 'bg-blue-100 text-blue-800',
  open: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

const statusLabels: Record<BeerBet['status'], string> = {
  awaiting_confirmation: 'Awaiting confirmation',
  open: 'Open',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
}

function nameFor(account: { nickname: string | null; display_name: string | null; email: string }) {
  return account.nickname?.trim() || account.display_name || account.email
}

export default function BeerBetsPage() {
  const { friendId } = useParams<{ friendId: string }>()
  const { me } = useAuth()
  const [friend, setFriend] = useState<Friend | null>(null)
  const [bets, setBets] = useState<BeerBet[]>([])
  const [summary, setSummary] = useState<BeerBetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCashOutModal, setShowCashOutModal] = useState(false)

  const id = Number(friendId)

  function loadBets() {
    Promise.all([listBetsWithFriend(id), getSummaryWithFriend(id)]).then(([b, s]) => {
      setBets(b)
      setSummary(s)
    })
  }

  useEffect(() => {
    listFriends().then((friends) => setFriend(friends.find((f) => f.id === id) ?? null))
    loadBets()
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleCreate(title: string, description: string | null, stake: number) {
    await createBet(id, title, description, stake)
    loadBets()
  }

  async function handleConfirm(betId: number) {
    await confirmBet(betId)
    loadBets()
  }

  async function handleCancel(betId: number) {
    await cancelBet(betId)
    loadBets()
  }

  async function handleResolve(betId: number, winnerId: number) {
    await resolveBet(betId, winnerId)
    loadBets()
  }

  async function handleConfirmWinner(betId: number) {
    await confirmWinner(betId)
    loadBets()
  }

  async function handleDisputeWinner(betId: number) {
    await disputeWinner(betId)
    loadBets()
  }

  async function handleCashOut(beers: number) {
    await cashOut(id, beers)
    loadBets()
  }

  if (loading || !friend) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/beer-bets"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to friends
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <Avatar name={nameFor(friend)} color={friend.avatar_color} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">Beer Bets vs {nameFor(friend)}</h1>
        </div>
      </div>

      {summary && (
        <div className="mb-8 flex flex-col items-center gap-4 rounded-xl border border-gray-200 p-6 text-center dark:border-gray-800">
          {summary.net_beers === 0 ? (
            <p className="text-lg font-medium">
              <Beer className="mr-2 inline h-5 w-5" aria-hidden="true" />
              All square — no beers owed.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-lg font-medium">
              <span>{summary.owed_by === 'me' ? 'You' : nameFor(friend)}</span>
              <ArrowRight className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <span>{summary.owed_by === 'me' ? nameFor(friend) : 'You'}</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-sm text-amber-800">
                <Beer className="h-4 w-4" aria-hidden="true" />
                {summary.net_beers}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowCashOutModal(true)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            Cash out
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bets</h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          New bet
        </button>
      </div>

      {bets.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No bets yet — raise the first one.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bets.map((bet) => {
            const isOpponent = bet.opponent.id === me.id
            return (
              <div key={bet.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{bet.is_settlement ? 'Cash out' : bet.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusStyles[bet.status]}`}>
                    {statusLabels[bet.status]}
                  </span>
                </div>

                {bet.is_settlement ? (
                  <p className="text-sm font-medium">
                    🍻 {bet.winner_id === me.id ? 'You' : nameFor(friend)} paid {bet.stake} beer
                    {bet.stake === 1 ? '' : 's'}
                  </p>
                ) : (
                  <>
                    {bet.description && (
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{bet.description}</p>
                    )}
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                      Stake: {bet.stake} beer{bet.stake === 1 ? '' : 's'} · raised by{' '}
                      {bet.creator.id === me.id ? 'you' : nameFor(bet.creator)}
                    </p>

                    {bet.status === 'awaiting_confirmation' && (
                      <div className="flex gap-2">
                        {isOpponent && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(bet.id)}
                            className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:opacity-90"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancel(bet.id)}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                        >
                          Cancel bet
                        </button>
                      </div>
                    )}
                    {bet.status === 'open' && bet.claimed_winner_id != null && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {bet.claimed_by_id === me.id
                            ? `Waiting for ${nameFor(friend)} to confirm your claim that ${
                                bet.claimed_winner_id === me.id ? 'you' : nameFor(friend)
                              } won.`
                            : `${nameFor(friend)} claimed ${
                                bet.claimed_winner_id === me.id ? 'you' : 'they'
                              } won this bet — confirm or dispute.`}
                        </span>
                        {bet.claimed_by_id !== me.id && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmWinner(bet.id)}
                              className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:opacity-90"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDisputeWinner(bet.id)}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:opacity-90"
                            >
                              Dispute
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {bet.status === 'open' && bet.claimed_winner_id == null && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Who won?</span>
                        <button
                          type="button"
                          onClick={() => handleResolve(bet.id, me.id)}
                          className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                        >
                          I won
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(bet.id, isOpponent ? bet.creator.id : bet.opponent.id)}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                        >
                          {nameFor(friend)} won
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(bet.id)}
                          className="ml-auto text-xs text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          Cancel bet
                        </button>
                      </div>
                    )}
                    {bet.status === 'resolved' && (
                      <p className="text-sm font-medium">
                        🏆 {bet.winner_id === me.id ? 'You' : nameFor(friend)} won
                      </p>
                    )}
                    {bet.status === 'cancelled' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">This bet was cancelled.</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && <NewBetModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
      {showCashOutModal && (
        <CashOutModal
          friendName={nameFor(friend)}
          onClose={() => setShowCashOutModal(false)}
          onCashOut={handleCashOut}
        />
      )}
    </main>
  )
}
