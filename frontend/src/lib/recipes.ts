import { apiFetch } from './api'

export interface Ingredient {
  name: string
  amount: number | null
  unit: string | null
}

export interface StepDetail {
  timer_seconds: number | null
  ingredients: string[]
}

export const RECIPE_CATEGORIES = [
  { value: 'meals', label: 'Meals' },
  { value: 'baking', label: 'Baking' },
  { value: 'other', label: 'Other' },
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]['value']

export interface Recipe {
  id: number
  title: string
  image_url: string | null
  description: string
  servings: number | null
  ingredients: Ingredient[]
  steps: string[]
  step_details: StepDetail[] | null
  category: RecipeCategory
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export async function listRecipes(): Promise<Recipe[]> {
  const response = await apiFetch('/api/recipes/')
  return response.json()
}

export async function getRecipe(id: number): Promise<Recipe> {
  const response = await apiFetch(`/api/recipes/${id}`)
  return response.json()
}

export async function updateRecipeNotes(id: number, notes: string): Promise<Recipe> {
  const response = await apiFetch(`/api/recipes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  return response.json()
}

export async function updateRecipeCategory(id: number, category: RecipeCategory): Promise<Recipe> {
  const response = await apiFetch(`/api/recipes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  })
  return response.json()
}

export async function deleteRecipe(id: number): Promise<void> {
  await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' })
}
