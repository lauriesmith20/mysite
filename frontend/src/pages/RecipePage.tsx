import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { deleteRecipe, getRecipe, updateRecipeNotes, type Recipe } from '../lib/recipes'

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

  async function handleDelete() {
    if (!id) return
    await deleteRecipe(Number(id))
    navigate('/recipes')
  }

  if (!recipe) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/recipes"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to recipes
        </Link>
        <button
          onClick={handleDelete}
          aria-label="Delete recipe"
          className="text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="mb-6 h-56 w-full rounded-xl object-cover"
        />
      )}
      <h1 className="mb-2 text-3xl font-bold">{recipe.title}</h1>
      <p className="mb-2 text-gray-600 dark:text-gray-300">{recipe.description}</p>
      <div className="mb-8 flex flex-wrap items-center gap-2">
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
    </main>
  )
}
