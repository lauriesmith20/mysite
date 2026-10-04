import { useEffect, useState } from 'react'
import { Beer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import BackLink from '../components/BackLink'
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

const statusLabels: Record<BeerBet['status'], string> = {
  awaiting_confirmation: 'Awaiting confirmation',
  open: 'Open',
  resolved: 'Settled',
  cancelled: 'Cancelled',
}

const statusChip: Record<BeerBet['status'], string> = {
  awaiting_confirmation: 'bg-[#F2C85A] text-[#2A2006]',
  open: 'bg-(--chip) text-(--ink)',
  resolved: 'bg-[#B9E0AA] text-[#14240F]',
  cancelled: 'bg-(--chip) text-(--soft)',
}

const ME_COLOR = '#EC4060'
const FRIEND_COLOR = '#4A5BE0'

const pill = 'h-11 rounded-full px-4 text-sm font-extrabold transition active:scale-[0.97]'
const primaryPill = `${pill} bg-(--ink) text-(--bg)`
const quietPill = `${pill} bg-(--chip) text-(--ink)`

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
  const [tab, setTab] = useState<'open' | 'settled'>('open')

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
      <main className="mx-auto max-w-2xl px-5 pb-10 pt-1 md:pt-6 text-center">
        <p className="text-(--soft)">Loading…</p>
      </main>
    )
  }

  const friendName = nameFor(friend)
  const isActive = (b: BeerBet) => b.status === 'open' || b.status === 'awaiting_confirmation'
  const openBets = bets.filter(isActive)
  const settledBets = bets.filter((b) => !isActive(b))
  const visible = tab === 'open' ? openBets : settledBets
  const beers = (n: number) => `${n} beer${n === 1 ? '' : 's'}`

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-5 pb-10 pt-1 md:pt-6">
      <BackLink to="/beer-bets" label="Back to friends" />

      <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight">Beer Bets</h1>
      <p className="-mt-2 text-sm text-(--soft)">vs {friendName}</p>

      {summary && (
        <div className="flex items-center justify-between rounded-[22px] bg-[#F2C85A] px-[18px] py-4 text-[#2A2006]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold">Running tab</span>
            <span className="text-[22px] font-extrabold leading-tight">
              {summary.net_beers === 0
                ? 'All square'
                : summary.owed_by === 'me'
                  ? `You owe ${friendName} ${beers(summary.net_beers)}`
                  : `${friendName} owes you ${beers(summary.net_beers)}`}
            </span>
          </div>
          <Beer size={44} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
        </div>
      )}

      <div className="flex gap-2">
        {(['open', 'settled'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-4 py-2.5 text-sm font-bold ${
              tab === t ? 'bg-(--ink) text-(--bg)' : 'bg-(--chip) text-(--soft)'
            }`}
          >
            {t === 'open' ? `Open · ${openBets.length}` : `Settled · ${settledBets.length}`}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-(--soft)">
          {tab === 'open' ? 'No open bets — raise the first one.' : 'Nothing settled yet.'}
        </p>
      )}

      {visible.map((bet) => {
        const isOpponent = bet.opponent.id === me.id
        const iAmCreator = bet.creator.id === me.id
        const myName = 'You'
        const left = iAmCreator ? myName : nameFor(bet.creator)
        const right = isOpponent ? myName : nameFor(bet.opponent)
        const leftColor = iAmCreator ? ME_COLOR : FRIEND_COLOR
        const rightColor = isOpponent ? ME_COLOR : FRIEND_COLOR
        const colorFor = (id: number) => (id === me.id ? ME_COLOR : FRIEND_COLOR)
        const winnerName = bet.winner_id === me.id ? 'You' : friendName

        return (
          <article
            key={bet.id}
            className={`relative overflow-hidden rounded-[22px] bg-(--card) shadow-(--card-shadow) ${
              bet.status === 'resolved' || bet.status === 'cancelled' ? 'opacity-90' : ''
            }`}
          >
            <div className="flex flex-col gap-3 px-[18px] pb-4 pt-[18px]">
              <div className="flex items-center justify-between">
                <span className={`rounded-xl px-2.5 py-1 text-xs font-bold ${statusChip[bet.status]}`}>
                  {bet.is_settlement ? 'Cash out' : statusLabels[bet.status]}
                </span>
                <span className="text-xs font-semibold text-(--soft)">Slip #{String(bet.id).padStart(2, '0')}</span>
              </div>
              <h2 className="text-xl font-extrabold leading-tight">
                {bet.is_settlement ? 'Beers paid off' : bet.title}
              </h2>
              {bet.description && !bet.is_settlement && (
                <p className="-mt-1 text-sm text-(--soft)">{bet.description}</p>
              )}
              {!bet.is_settlement && (
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex-1 rounded-[14px] p-2.5 text-center font-extrabold text-[#1b1220]"
                    style={{ backgroundColor: leftColor, color: leftColor === FRIEND_COLOR ? '#fff' : undefined }}
                  >
                    {left}
                  </span>
                  <span className="text-[13px] font-extrabold text-(--soft)">VS</span>
                  <span
                    className="flex-1 rounded-[14px] p-2.5 text-center font-extrabold text-[#1b1220]"
                    style={{ backgroundColor: rightColor, color: rightColor === FRIEND_COLOR ? '#fff' : undefined }}
                  >
                    {right}
                  </span>
                </div>
              )}
            </div>

            <div className="relative mx-3.5 border-t-2 border-dashed border-(--chip)">
              <span className="absolute -left-6 -top-[11px] h-[22px] w-[22px] rounded-full bg-(--bg)" />
              <span className="absolute -right-6 -top-[11px] h-[22px] w-[22px] rounded-full bg-(--bg)" />
            </div>

            <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-(--soft)">{bet.is_settlement ? 'Paid' : 'Stakes'}</span>
                <span className="text-right font-extrabold">
                  {bet.is_settlement
                    ? `${winnerName} paid ${beers(bet.stake)}`
                    : `${beers(bet.stake)} · raised by ${iAmCreator ? 'you' : nameFor(bet.creator)}`}
                </span>
              </div>

              {!bet.is_settlement && (
                <>
                  {bet.status === 'awaiting_confirmation' && (
                    <div className="flex gap-2.5">
                      {isOpponent && (
                        <button type="button" onClick={() => handleConfirm(bet.id)} className={`flex-1 ${primaryPill}`}>
                          Confirm
                        </button>
                      )}
                      <button type="button" onClick={() => handleCancel(bet.id)} className={`flex-1 ${quietPill}`}>
                        Cancel bet
                      </button>
                    </div>
                  )}

                  {bet.status === 'open' && bet.claimed_winner_id != null && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-sm text-(--soft)">
                        {bet.claimed_by_id === me.id
                          ? `Waiting for ${friendName} to confirm your claim that ${
                              bet.claimed_winner_id === me.id ? 'you' : friendName
                            } won.`
                          : `${friendName} claimed ${
                              bet.claimed_winner_id === me.id ? 'you' : 'they'
                            } won this bet — confirm or dispute.`}
                      </p>
                      {bet.claimed_by_id !== me.id && (
                        <div className="flex gap-2.5">
                          <button type="button" onClick={() => handleConfirmWinner(bet.id)} className={`flex-1 ${primaryPill}`}>
                            Confirm
                          </button>
                          <button type="button" onClick={() => handleDisputeWinner(bet.id)} className={`flex-1 ${quietPill}`}>
                            Dispute
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {bet.status === 'open' && bet.claimed_winner_id == null && (
                    <>
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleResolve(bet.id, me.id)}
                          className="h-[46px] flex-1 rounded-full text-sm font-extrabold text-[#1b1220] transition active:scale-[0.97]"
                          style={{ backgroundColor: ME_COLOR }}
                        >
                          I won
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(bet.id, isOpponent ? bet.creator.id : bet.opponent.id)}
                          className="h-[46px] flex-1 rounded-full text-sm font-extrabold text-white transition active:scale-[0.97]"
                          style={{ backgroundColor: FRIEND_COLOR }}
                        >
                          {friendName} won
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancel(bet.id)}
                        className="self-center text-xs text-(--soft) underline"
                      >
                        Cancel bet
                      </button>
                    </>
                  )}

                  {bet.status === 'resolved' && (
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-(--soft)">Winner</span>
                      <span className="flex items-center gap-2 font-extrabold">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: colorFor(bet.winner_id ?? 0) }}
                          aria-hidden="true"
                        />
                        {winnerName}
                      </span>
                    </div>
                  )}
                  {bet.status === 'cancelled' && <p className="text-sm text-(--soft)">This bet was cancelled.</p>}
                </>
              )}
            </div>
          </article>
        )
      })}

      <div className="mt-2 flex gap-2.5">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-[54px] flex-1 rounded-full bg-(--ink) text-base font-extrabold text-(--bg) transition active:scale-[0.97]"
        >
          New bet slip
        </button>
        <button
          type="button"
          onClick={() => setShowCashOutModal(true)}
          className="h-[54px] flex-1 rounded-full bg-(--chip) text-base font-extrabold text-(--ink) transition active:scale-[0.97]"
        >
          Cash out
        </button>
      </div>

      {showModal && <NewBetModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
      {showCashOutModal && (
        <CashOutModal friendName={friendName} onClose={() => setShowCashOutModal(false)} onCashOut={handleCashOut} />
      )}
    </main>
  )
}
