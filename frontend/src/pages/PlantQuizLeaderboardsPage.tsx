import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getBigLeaderboard,
  getLeaderboard,
  type BigLeaderboardEntry,
  type LeaderboardEntry,
} from '../lib/plantQuiz'

function medal(i: number): string {
  return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
}

export default function PlantQuizLeaderboardsPage() {
  const [normal, setNormal] = useState<LeaderboardEntry[]>([])
  const [big, setBig] = useState<BigLeaderboardEntry[]>([])

  useEffect(() => {
    getLeaderboard().then(setNormal).catch(() => {})
    getBigLeaderboard().then(setBig).catch(() => {})
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/plant-quiz"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quiz menu
      </Link>
      <h1 className="mb-8 text-3xl font-bold">🏅 Leaderboards</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Normal Quiz (avg / 10)</h2>
        {normal.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No scores yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">Games</th>
              </tr>
            </thead>
            <tbody>
              {normal.map((row, i) => (
                <tr key={row.player_name} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-3 py-2">{medal(i)}</td>
                  <td className="px-3 py-2">{row.player_name}</td>
                  <td className="px-3 py-2">{row.avg_score}</td>
                  <td className="px-3 py-2">{row.games_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">The Big Quiz™️ (best score)</h2>
        {big.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No scores yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Best</th>
                <th className="px-3 py-2">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {big.map((row, i) => (
                <tr key={row.player_name} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-3 py-2">{medal(i)}</td>
                  <td className="px-3 py-2">{row.player_name}</td>
                  <td className="px-3 py-2">{row.best_score}</td>
                  <td className="px-3 py-2">{row.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
