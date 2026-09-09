import { useEffect, useState } from 'react'
import Tile from '../components/Tile'
import { listTiles, type Tile as TileData } from '../lib/tiles'

export default function HomePage() {
  const [tiles, setTiles] = useState<TileData[]>([])

  useEffect(() => {
    listTiles().then(setTiles)
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} />
        ))}
      </div>
    </main>
  )
}
