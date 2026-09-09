import { Link } from 'react-router-dom'
import { getIcon } from '../lib/icons'
import type { Tile } from '../lib/tiles'

export default function TileComponent({ tile }: { tile: Tile }) {
  const Icon = getIcon(tile.icon)

  return (
    <Link
      to={tile.href}
      className="flex aspect-square flex-col overflow-hidden rounded-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: tile.color }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4">
        <Icon aria-hidden="true" className="h-full w-full" strokeWidth={1.5} />
      </div>
      <h2 className="shrink-0 truncate px-3 pb-3 text-center text-sm font-semibold">{tile.title}</h2>
    </Link>
  )
}
