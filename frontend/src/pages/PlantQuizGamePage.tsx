import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  getBigLeaderboard,
  getLeaderboard,
  listPlants,
  submitBigScore,
  submitScore,
  type BigLeaderboardEntry,
  type LeaderboardEntry,
  type Plant,
} from '../lib/plantQuiz'

const NORMAL_QUIZ_SIZE = 10

interface Option extends Plant {
  correct: boolean
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildOptions(plants: Plant[], correct: Plant): Option[] {
  const wrong = shuffle(plants.filter((p) => p.name !== correct.name)).slice(0, 3)
  return shuffle([
    { ...correct, correct: true },
    ...wrong.map((p) => ({ ...p, correct: false })),
  ])
}

function finishedEmoji(correct: number, total: number): string {
  const pct = total > 0 ? correct / total : 0
  if (pct >= 0.9) return '🏆'
  if (pct >= 0.7) return '🌟'
  if (pct >= 0.5) return '🌿'
  return '🌱'
}

export default function PlantQuizGamePage() {
  const { mode: rawMode } = useParams<{ mode: string }>()
  const isBig = rawMode === 'big'

  const [plants, setPlants] = useState<Plant[]>([])
  const [questions, setQuestions] = useState<Plant[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [screen, setScreen] = useState<'loading' | 'quiz' | 'done'>('loading')
  const [normalLeaderboard, setNormalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [bigLeaderboard, setBigLeaderboard] = useState<BigLeaderboardEntry[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    setScreen('loading')
    listPlants().then((data) => {
      setPlants(data)
      const round = isBig ? shuffle(data) : shuffle(data).slice(0, NORMAL_QUIZ_SIZE)
      setQuestions(round)
      setIndex(0)
      setScore({ correct: 0, total: 0 })
      setSelected(null)
      setAnswered(false)
      setScreen('quiz')
    })
  }, [isBig])

  const current = questions[index] ?? null
  const options = useMemo(
    () => (current && plants.length > 0 ? buildOptions(plants, current) : []),
    [current, plants],
  )

  // Preload the image ahead of showing it, so the visible picture can never lag behind the
  // question/options — answering is disabled until it's ready.
  useEffect(() => {
    if (!current) return
    setImageLoaded(false)
    let cancelled = false
    const img = new Image()
    img.src = current.img
    img.onload = () => {
      if (!cancelled) setImageLoaded(true)
    }
    img.onerror = () => {
      if (!cancelled) setImageLoaded(true)
    }
    return () => {
      cancelled = true
    }
  }, [current])

  async function finish(finalScore: { correct: number; total: number }) {
    setScreen('done')
    try {
      if (isBig) {
        await submitBigScore(finalScore.correct)
        setBigLeaderboard(await getBigLeaderboard())
      } else {
        await submitScore(finalScore.correct, finalScore.total)
        setNormalLeaderboard(await getLeaderboard())
      }
    } catch {
      /* non-fatal */
    }
  }

  function answer(opt: Option) {
    if (answered) return
    setAnswered(true)
    setSelected(opt.name)
    setScore((s) => ({
      correct: s.correct + (opt.correct ? 1 : 0),
      total: s.total + 1,
    }))
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setSelected(null)
      setAnswered(false)
    } else {
      finish(score)
    }
  }

  function restart() {
    const round = isBig ? shuffle(plants) : shuffle(plants).slice(0, NORMAL_QUIZ_SIZE)
    setQuestions(round)
    setIndex(0)
    setScore({ correct: 0, total: 0 })
    setSelected(null)
    setAnswered(false)
    setScreen('quiz')
  }

  const leaderboard = isBig ? bigLeaderboard : normalLeaderboard

  if (screen === 'loading') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/plant-quiz"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quiz menu
        </Link>
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {isBig ? 'The Big Quiz™️' : 'Normal Quiz'}
        </span>
      </div>

      {screen === 'quiz' && current && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Question {index + 1} of {questions.length}
            </p>
            <p className="text-sm font-semibold">
              {score.correct} / {score.total}
            </p>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
              {imageLoaded ? (
                <img
                  src={current.img}
                  alt="A botanical illustration — can you name this plant?"
                  className="h-56 w-56 rounded-xl object-contain"
                />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading image…" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((opt) => {
              const isSelected = opt.name === selected
              const showCorrect = answered && opt.correct
              const showWrong = answered && !opt.correct && isSelected
              return (
                <button
                  key={opt.name}
                  type="button"
                  disabled={answered || !imageLoaded}
                  onClick={() => answer(opt)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-not-allowed ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                      : showWrong
                        ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'
                  }`}
                >
                  {opt.name}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={next}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {index + 1 < questions.length ? 'Next plant →' : 'See results 🏆'}
              </button>
            </div>
          )}
        </div>
      )}

      {screen === 'done' && (
        <div className="text-center">
          <div className="mb-2 text-5xl">{finishedEmoji(score.correct, score.total)}</div>
          <h1 className="mb-1 text-2xl font-bold">You scored</h1>
          <p className="mb-2 text-3xl font-extrabold text-green-700 dark:text-green-400">
            {score.correct} / {score.total}
          </p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {score.correct === score.total ? 'Perfect score! 🌟' : 'Keep practising!'}
          </p>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Play again 🌿
          </button>

          {leaderboard.length > 0 && (
            <div className="mx-auto mt-10 max-w-md text-left">
              <h2 className="mb-3 text-center text-lg font-semibold">
                🏅 Leaderboard {isBig ? '(best score)' : '(avg / 10)'}
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">{isBig ? 'Best' : 'Avg'}</th>
                    <th className="px-3 py-2">{isBig ? 'Attempts' : 'Games'}</th>
                  </tr>
                </thead>
                <tbody>
                  {isBig
                    ? bigLeaderboard.map((row, i) => (
                        <tr key={row.player_name} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{row.player_name}</td>
                          <td className="px-3 py-2">{row.best_score}</td>
                          <td className="px-3 py-2">{row.attempts}</td>
                        </tr>
                      ))
                    : normalLeaderboard.map((row, i) => (
                        <tr key={row.player_name} className="border-t border-gray-200 dark:border-gray-800">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{row.player_name}</td>
                          <td className="px-3 py-2">{row.avg_score}</td>
                          <td className="px-3 py-2">{row.games_played}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
