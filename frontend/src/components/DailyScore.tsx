/** A score as a row of icons (e.g. suitcases): earned ones in colour, the rest faded. */
export default function DailyScore({
  score,
  max,
  icon,
  label = 'points',
  className = 'gap-0.5 text-xl',
}: {
  score: number
  max: number
  icon: string
  /** Plural noun for screen readers, e.g. "suitcases". */
  label?: string
  className?: string
}) {
  return (
    <div className={`flex ${className}`} role="img" aria-label={`${score} of ${max} ${label}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < score ? '' : 'opacity-25 grayscale'} aria-hidden="true">
          {icon}
        </span>
      ))}
    </div>
  )
}
