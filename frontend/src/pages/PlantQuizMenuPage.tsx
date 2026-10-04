import { Link } from 'react-router-dom'
import Page from '../shared/layout/Page'

export default function PlantQuizMenuPage() {
  return (
    <Page
      title="🪴 Plant Quiz"
      subtitle="Botanical illustrations from Köhler's Medizinal-Pflanzen (1887) — can you name them?"
    >
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
    </Page>
  )
}
