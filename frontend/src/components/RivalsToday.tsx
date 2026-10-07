import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import DailyScore from './DailyScore'
import Lives from './Lives'
import type { DailyGameInfo } from '../lib/dailyGameRegistry'
import type { RivalToday } from '../lib/dailyGames'
import { accountName } from '../lib/friends'

/** How your rivals did today, shown once you've finished the puzzle yourself. Renders nothing if you have none. */
export default function RivalsToday({ rivals, game }: { rivals: RivalToday[]; game: DailyGameInfo }) {
  if (rivals.length === 0) return null
  return (
    <section className="flex w-full flex-col gap-2 rounded-[24px] bg-(--card) p-4 shadow-(--card-shadow)">
      <h2 className="text-center text-[15px] font-extrabold">Your rivals today</h2>
      <ul className="flex flex-col gap-2">
        {rivals.map((rival) => {
          const name = accountName(rival.friend)
          const lives = rival.friend_result ? (game.lives?.(rival.friend_result) ?? null) : null
          return (
            <li key={rival.game_id}>
              <Link
                to={`/h2h-game/${rival.game_id}`}
                className="flex items-center gap-3 rounded-[16px] bg-(--chip) px-3 py-2.5 text-left transition active:scale-[0.98]"
              >
                <Avatar name={name} color={rival.friend.avatar_color} />
                <span className="min-w-0 flex-1 truncate text-[16px] font-extrabold">{name}</span>
                {rival.friend_result ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <DailyScore
                      score={rival.friend_result.score}
                      max={game.maxScore}
                      icon={game.scoreIcon}
                      label="points"
                      className="gap-0.5 text-base"
                    />
                    {lives && <Lives lives={lives.left} max={lives.max} size={12} icon={lives.icon} />}
                  </div>
                ) : (
                  <span className="shrink-0 text-[13px] font-semibold text-(--soft)">
                    {rival.friend_played ? 'Played' : "Hasn't played yet"}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
