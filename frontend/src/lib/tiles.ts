import { apiFetch } from './api'

export interface Tile {
  id: number
  title: string
  href: string
  color: string
  icon: string | null
}

export async function listTiles(): Promise<Tile[]> {
  const response = await apiFetch('/api/tiles/')
  return response.json()
}
