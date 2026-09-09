import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PlantQuizMenuPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back home
      </Link>
      <h1 className="mb-2 text-3xl font-bold">🪴 Plant Quiz</h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Botanical illustrations from Köhler's Medizinal-Pflanzen (1887) — can you name them?
      </p>
      <div className="flex flex-col gap-4">
        <Link
          to="/plant-quiz/normal"
          className="rounded-xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold">Normal Quiz</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">10 random plants, multiple choice.</p>
        </Link>
        <Link
          to="/plant-quiz/big"
          className="rounded-xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold">The Big Quiz™️</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Every plant, one shot. How many do you know?</p>
        </Link>
        <Link
          to="/plant-quiz/leaderboards"
          className="rounded-xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold">🏅 Leaderboards</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">See how you stack up.</p>
        </Link>
      </div>
    </main>
  )
}
