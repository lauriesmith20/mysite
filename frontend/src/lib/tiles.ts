import { apiFetch, publicFetch } from './api'

export interface Tile {
  id: number
  title: string
  href: string
  color: string
  icon: string | null
  is_public: boolean
}

export async function listTiles(): Promise<Tile[]> {
  const response = await apiFetch('/api/tiles/')
  return response.json()
}

/** Guest-friendly tiles: needs no sign-in. */
export async function listPublicTiles(): Promise<Tile[]> {
  const response = await publicFetch('/api/tiles/public')
  return response.json()
}
