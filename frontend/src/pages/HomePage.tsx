import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthGate'
import Tile from '../components/Tile'
import { listTiles, type Tile as TileData } from '../lib/tiles'

export default function HomePage() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const { me } = useAuth()
  const name = me.nickname || me.display_name

  useEffect(() => {
    listTiles()
      .then(setTiles)
      .finally(() => setLoading(false))
  }, [])

  const q = query.trim().toLowerCase()
  const visible = q ? tiles.filter((t) => t.title.toLowerCase().includes(q)) : tiles

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-3 md:px-12 md:pt-14">
      <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
        {name ? `Welcome, ${name}` : 'Welcome'}
      </h1>

      <label className="mt-4 flex h-12 items-center gap-2.5 rounded-full bg-(--chip) px-4 text-(--soft) md:mt-8 md:h-11 md:max-w-sm">
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-(--ink) outline-none placeholder:text-(--soft)"
        />
      </label>

      {loading ? (
        <p className="mt-8 text-(--soft)">Loading…</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3.5 md:mt-10 md:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] md:gap-6">
          {visible.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      )}
    </main>
  )
}
