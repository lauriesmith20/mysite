import { useMsal } from '@azure/msal-react'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import Tile from '../components/Tile'
import { listPublicTiles, type Tile as TileData } from '../lib/tiles'
import { apiScopes } from '../lib/msal'
import { useTheme } from '../lib/theme'

// Home for signed-out visitors: only guest-friendly (public) tiles, plus a way to sign in.
export default function GuestHomePage() {
  const { instance } = useMsal()
  const { dark, toggle } = useTheme()
  const [tiles, setTiles] = useState<TileData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPublicTiles()
      .then(setTiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-4 md:px-12">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xl font-extrabold">Laurie's Website</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => instance.loginRedirect({ scopes: apiScopes })}
            className="h-11 rounded-full bg-(--ink) px-5 text-sm font-extrabold text-(--bg) transition active:scale-[0.97]"
          >
            Sign in
          </button>
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip) text-(--ink)"
          >
            {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight md:mt-12 md:text-6xl">Welcome</h1>
      <p className="mt-2 text-(--soft)">Try these out. Sign in for the rest.</p>

      {loading ? (
        <p className="mt-8 text-(--soft)">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3.5 md:mt-10 md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] md:gap-6">
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      )}
    </main>
  )
}
