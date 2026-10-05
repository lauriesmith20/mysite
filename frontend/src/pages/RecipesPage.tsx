import { useEffect, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import Page from '../shared/layout/Page'
import RecipeTile from '../components/RecipeTile'
import { RECIPE_CATEGORIES, listRecipes, type Recipe, type RecipeCategory } from '../lib/recipes'

const FILTERS: { value: RecipeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...RECIPE_CATEGORIES,
]

const COMPACT_KEY = 'recipes-compact'

function readCompact(): boolean {
  try {
    return localStorage.getItem(COMPACT_KEY) === '1'
  } catch {
    return false
  }
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [compact, setCompact] = useState(readCompact)
  const [filter, setFilter] = useState<RecipeCategory | 'all'>('all')

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .finally(() => setLoading(false))
  }, [])

  function toggleCompact() {
    const next = !compact
    setCompact(next)
    try {
      localStorage.setItem(COMPACT_KEY, next ? '1' : '0')
    } catch {
      // storage unavailable; the choice still applies for this session
    }
  }

  const SwitchIcon = compact ? List : LayoutGrid
  const visible = filter === 'all' ? recipes : recipes.filter((r) => r.category === filter)

  return (
    <Page
      title="Recipes"
      width="wide"
      actions={
        // Phone-only: from `sm` up the grid is already multi-column.
        <button
          onClick={toggleCompact}
          aria-label={compact ? 'Show larger tiles' : 'Show smaller tiles'}
          className="p-2 text-gray-500 transition hover:text-gray-900 sm:hidden dark:text-gray-400 dark:hover:text-gray-100"
        >
          <SwitchIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      }
    >
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No recipes yet.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  filter === value
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No recipes in this category.</p>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 ${compact ? 'max-sm:grid-cols-2 max-sm:gap-3' : ''}`}
            >
              {visible.map((recipe) => (
                <RecipeTile key={recipe.id} recipe={recipe} compact={compact} />
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  )
}
