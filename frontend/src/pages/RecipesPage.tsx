import { useEffect, useState } from 'react'
import Page from '../shared/layout/Page'
import RecipeTile from '../components/RecipeTile'
import { listRecipes, type Recipe } from '../lib/recipes'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Page title="Recipes" width="wide">
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No recipes yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeTile key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </Page>
  )
}
