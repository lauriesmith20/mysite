import { apiFetch } from './api'

export interface Plant {
  name: string
  img: string
}

export interface LeaderboardEntry {
  player_name: string
  avg_score: number
  games_played: number
}

export interface BigLeaderboardEntry {
  player_name: string
  best_score: number
  attempts: number
}

export async function listPlants(): Promise<Plant[]> {
  const response = await apiFetch('/api/plant-quiz/plants')
  return response.json()
}

export async function submitScore(correct: number, total: number): Promise<void> {
  await apiFetch('/api/plant-quiz/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correct, total }),
  })
}

export async function submitBigScore(score: number): Promise<void> {
  await apiFetch('/api/plant-quiz/big-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  })
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await apiFetch('/api/plant-quiz/leaderboard')
  return response.json()
}

export async function getBigLeaderboard(): Promise<BigLeaderboardEntry[]> {
  const response = await apiFetch('/api/plant-quiz/big-leaderboard')
  return response.json()
}
