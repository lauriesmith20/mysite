import { useEffect, useState } from 'react'
import RecipeTile from '../components/RecipeTile'
import { listRecipes, type Recipe } from '../lib/recipes'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])

  useEffect(() => {
    listRecipes().then(setRecipes)
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">Recipes</h1>
      {recipes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No recipes yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeTile key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  )
}
