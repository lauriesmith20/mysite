import { Link } from 'react-router-dom'
import type { Recipe } from '../lib/recipes'

export default function RecipeTile({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800"
    >
      <div className="flex h-32 items-center justify-center bg-gray-100 dark:bg-gray-900">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🍳
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold">{recipe.title}</h2>
        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{recipe.description}</p>
      </div>
    </Link>
  )
}
