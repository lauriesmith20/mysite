export const ME_COLOR = '#EC4060'
export const FRIEND_COLOR = '#4A5BE0'

/** Red (you) / blue (them) bar sized by score. Level at 0–0 so there's always something to see. */
export default function ScoreBar({
  mine,
  theirs,
  className = 'h-2',
}: {
  mine: number
  theirs: number
  className?: string
}) {
  const empty = mine === 0 && theirs === 0
  return (
    <div className={`flex gap-[3px] overflow-hidden rounded bg-(--chip) ${className}`} aria-hidden="true">
      <div style={{ flexGrow: empty ? 1 : mine, backgroundColor: ME_COLOR, opacity: empty ? 0.35 : 1 }} />
      <div style={{ flexGrow: empty ? 1 : theirs, backgroundColor: FRIEND_COLOR, opacity: empty ? 0.35 : 1 }} />
    </div>
  )
}
