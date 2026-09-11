import { useEffect, useState } from 'react'
import Tile from '../components/Tile'
import { listTiles, type Tile as TileData } from '../lib/tiles'

export default function HomePage() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listTiles()
      .then(setTiles)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      )}
    </main>
  )
}
