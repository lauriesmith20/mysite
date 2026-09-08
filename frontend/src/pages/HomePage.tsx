import Tile from '../components/Tile'
import { features } from '../features'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Personal Website</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {features.map((feature) => (
          <Tile key={feature.href} feature={feature} />
        ))}
      </div>
    </main>
  )
}
