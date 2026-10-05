import { Link } from 'react-router-dom'
import type { Recipe } from '../lib/recipes'

interface RecipeTileProps {
  recipe: Recipe
  /** Smaller tile for the phone-width grid; ignored from the `sm` breakpoint up. */
  compact?: boolean
}

export default function RecipeTile({ recipe, compact = false }: RecipeTileProps) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
    >
      <div
        className={`flex h-32 items-center justify-center bg-gray-100 dark:bg-gray-900 ${compact ? 'max-sm:h-24' : ''}`}
      >
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <span className={`text-4xl ${compact ? 'max-sm:text-3xl' : ''}`} aria-hidden="true">
            🍳
          </span>
        )}
      </div>
      <div className={`flex flex-col gap-1 p-4 ${compact ? 'max-sm:p-3' : ''}`}>
        <h2 className={`text-lg font-semibold ${compact ? 'max-sm:text-sm max-sm:leading-snug' : ''}`}>
          {recipe.title}
        </h2>
        <p
          className={`line-clamp-2 text-sm text-gray-500 dark:text-gray-400 ${compact ? 'max-sm:hidden' : ''}`}
        >
          {recipe.description}
        </p>
      </div>
    </Link>
  )
}
