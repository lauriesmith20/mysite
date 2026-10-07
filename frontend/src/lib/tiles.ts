import { apiFetch } from './api'
import type { Me } from './accounts'

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

// ── The home screen's tiles ──────────────────────────────────────────────────────────────────────

/** A tile as drawn on the home screen and in the menu. */
export interface HomeTile {
  href: string
  title: string
  color: string
  /** A key in lib/icons.ts. */
  icon: string
  /** The small tag on the tile. */
  badge: string
  /** Anyone can open it, signed in or not. */
  public?: boolean
}

// The tiles live here (not fetched) so the home screen draws instantly, even while the backend is waking up.
// Who may see each one is still decided by the backend (a tile row with the same href, access grants, `is_public`):
// `/me` returns the links an account can see. Add a tile here and in a migration that inserts its row.
export const HOME_TILES: HomeTile[] = [
  { href: '/game-scores', title: 'H2H Games', color: '#ed3e5b', icon: 'swords', badge: 'Live leaderboard' },
  { href: '/plant-quiz', title: 'Plant Quiz', color: '#B9E0A5', icon: 'sprout', badge: 'Daily question' },
  { href: '/recipes', title: 'Recipes', color: '#f2994a', icon: 'chef-hat', badge: "What's for dinner?" },
  { href: '/beer-bets', title: 'Beer Bets', color: '#f2c94c', icon: 'beer', badge: "Who's buying?" },
  {
    href: '/country-hopper',
    title: 'Country Hopper',
    color: '#8ec9f0',
    icon: 'route',
    badge: 'Fewest borders',
    public: true,
  },
  {
    href: '/shirt-game',
    title: 'Squad Numbers',
    color: '#4CB87B',
    icon: 'shirt',
    badge: 'Whose shirt is this?',
    public: true,
  },
]

/** The tiles for signed-out visitors. */
export const GUEST_TILES = HOME_TILES.filter((tile) => tile.public)

/** The tiles a signed-in account can see. */
export function tilesFor(me: Me): HomeTile[] {
  return HOME_TILES.filter((tile) => tile.public || me.tile_hrefs.includes(tile.href))
}
