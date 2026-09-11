import { apiFetch } from './api'
import type { AccountSummary } from './friends'

export type BeerBetStatus = 'awaiting_confirmation' | 'open' | 'resolved' | 'cancelled'

export interface BeerBet {
  id: number
  creator: AccountSummary
  opponent: AccountSummary
  title: string
  description: string | null
  stake: number
  status: BeerBetStatus
  winner_id: number | null
  claimed_winner_id: number | null
  claimed_by_id: number | null
  is_settlement: boolean
  created_at: string
  resolved_at: string | null
  cancelled_at: string | null
}

export interface BeerBetSummary {
  net_beers: number
  owed_by: 'me' | 'them' | null
}

export async function listBetsWithFriend(friendId: number): Promise<BeerBet[]> {
  const response = await apiFetch(`/api/beer-bets/with/${friendId}`)
  return response.json()
}

export async function getSummaryWithFriend(friendId: number): Promise<BeerBetSummary> {
  const response = await apiFetch(`/api/beer-bets/summary/${friendId}`)
  return response.json()
}

export async function createBet(
  opponentId: number,
  title: string,
  description: string | null,
  stake: number,
): Promise<BeerBet> {
  const response = await apiFetch('/api/beer-bets/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opponent_id: opponentId, title, description, stake }),
  })
  return response.json()
}

export async function confirmBet(id: number): Promise<BeerBet> {
  const response = await apiFetch(`/api/beer-bets/${id}/confirm`, { method: 'POST' })
  return response.json()
}

export async function resolveBet(id: number, winnerId: number): Promise<BeerBet> {
  const response = await apiFetch(`/api/beer-bets/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner_id: winnerId }),
  })
  return response.json()
}

export async function confirmWinner(id: number): Promise<BeerBet> {
  const response = await apiFetch(`/api/beer-bets/${id}/confirm-winner`, { method: 'POST' })
  return response.json()
}

export async function disputeWinner(id: number): Promise<BeerBet> {
  const response = await apiFetch(`/api/beer-bets/${id}/dispute-winner`, { method: 'POST' })
  return response.json()
}

export async function cancelBet(id: number): Promise<void> {
  await apiFetch(`/api/beer-bets/${id}`, { method: 'DELETE' })
}

export async function cashOut(friendId: number, beers: number): Promise<BeerBet> {
  const response = await apiFetch(`/api/beer-bets/cash-out/${friendId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beers }),
  })
  return response.json()
}
