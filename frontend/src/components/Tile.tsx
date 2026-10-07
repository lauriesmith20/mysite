import { Link } from 'react-router-dom'
import { getIcon } from '../lib/icons'
import type { Tile } from '../lib/tiles'

const badges: Record<string, string> = {
  swords: 'Live leaderboard',
  sprout: 'Daily question',
  'chef-hat': "What's for dinner?",
  beer: "Who's buying?",
  route: 'Fewest borders',
  shirt: 'Whose shirt is this?',
}

export default function TileComponent({ tile }: { tile: Tile }) {
  const Icon = getIcon(tile.icon)
  const badge = tile.icon ? badges[tile.icon] : undefined

  return (
    <Link
      to={tile.href}
      className="flex h-44 flex-col justify-between rounded-[22px] p-3.5 text-[#1b1220] shadow-(--tile-shadow) transition duration-200 hover:-translate-y-1 hover:-rotate-1 active:scale-[0.97] md:h-80 md:rounded-[28px] md:p-5"
      style={{ backgroundColor: tile.color }}
    >
      {badge ? (
        <span className="self-start rounded-xl bg-white/90 px-2.5 py-1 text-[11px] font-bold md:px-3 md:py-1.5 md:text-[13px]">
          {badge}
        </span>
      ) : (
        <span />
      )}
      <Icon aria-hidden="true" strokeWidth={1.8} className="h-16 w-16 self-center md:h-26 md:w-26" />
      <h2 className="text-center text-[17px] font-extrabold md:text-[22px]">{tile.title}</h2>
    </Link>
  )
}
