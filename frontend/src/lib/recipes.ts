import { apiFetch } from './api'

export interface Ingredient {
  name: string
  amount: number | null
  unit: string | null
}

export interface Recipe {
  id: number
  title: string
  image_url: string | null
  description: string
  servings: number | null
  ingredients: Ingredient[]
  steps: string[]
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

export async function deleteRecipe(id: number): Promise<void> {
  await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' })
}
