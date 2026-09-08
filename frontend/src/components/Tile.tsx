import type { Feature } from '../features'

export default function Tile({ feature }: { feature: Feature }) {
  return (
    <a
      href={feature.href}
      className="flex flex-col gap-2 rounded-xl border border-gray-200 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
    >
      <span className="text-3xl" aria-hidden="true">
        {feature.emoji}
      </span>
      <h2 className="text-lg font-semibold">{feature.title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
    </a>
  )
}
