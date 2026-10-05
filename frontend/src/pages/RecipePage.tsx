import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Page from '../shared/layout/Page'
import { ChefHat, Trash2 } from 'lucide-react'
import {
  RECIPE_CATEGORIES,
  deleteRecipe,
  getRecipe,
  updateRecipeCategory,
  updateRecipeNotes,
  type Recipe,
  type RecipeCategory,
} from '../lib/recipes'

export default function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) getRecipe(Number(id)).then((r) => {
      setRecipe(r)
      setNotes(r.notes ?? '')
    })
  }, [id])

  async function handleSaveNotes() {
    if (!id) return
    setSaving(true)
    try {
      const updated = await updateRecipeNotes(Number(id), notes)
      setRecipe(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryChange(category: RecipeCategory) {
    if (!id) return
    setRecipe(await updateRecipeCategory(Number(id), category))
  }

  async function handleDelete() {
    if (!id) return
    await deleteRecipe(Number(id))
    navigate('/recipes')
  }

  if (!recipe) {
    return (
      <Page back={{ to: '/recipes', label: 'Back to recipes' }}>
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      </Page>
    )
  }

  return (
    <Page
      title={recipe.title}
      back={{ to: '/recipes', label: 'Back to recipes' }}
      actions={
        <button
          onClick={handleDelete}
          aria-label="Delete recipe"
          className="p-2 text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      }
    >
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="mb-6 h-56 w-full rounded-xl object-cover"
        />
      )}
      <p className="mb-2 text-gray-600 dark:text-gray-300">{recipe.description}</p>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <select
          value={recipe.category}
          onChange={(e) => handleCategoryChange(e.target.value as RecipeCategory)}
          aria-label="Category"
          className="rounded-full border border-gray-200 bg-transparent px-2 py-0.5 text-xs font-medium dark:border-gray-800"
        >
          {RECIPE_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {recipe.servings != null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">Serves {recipe.servings}</span>
        )}
        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Ingredients</h2>
        <ul className="list-disc space-y-1 pl-5">
          {recipe.ingredients.map((ingredient, i) => (
            <li key={i}>
              {[ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean).join(' ')}
            </li>
          ))}
        </ul>
      </section>

      <Link
        to={`/recipes/${recipe.id}/cook`}
        className="mb-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F09A52] text-[17px] font-extrabold text-[#2A1606] transition active:scale-[0.97]"
      >
        <ChefHat className="h-5 w-5" aria-hidden="true" />
        Start cooking
      </Link>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Method</h2>
        <ol className="list-decimal space-y-2 pl-5">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes from making this…"
          className="w-full rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
        <button
          onClick={handleSaveNotes}
          disabled={saving || notes === (recipe.notes ?? '')}
          className="mt-2 rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </section>
    </Page>
  )
}
