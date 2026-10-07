import { X } from 'lucide-react'

/**
 * Lives as a row of red Xs, or of an emoji (e.g. gloves) when `icon` is given: the ones you still have in
 * full colour, lost ones faded.
 */
export default function Lives({
  lives,
  max,
  size = 28,
  icon,
}: {
  lives: number
  max: number
  size?: number
  icon?: string
}) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${lives} of ${max} lives left`}>
      {Array.from({ length: max }, (_, i) =>
        icon ? (
          <span
            key={i}
            aria-hidden="true"
            className={`leading-none transition duration-300 ${i < lives ? '' : 'opacity-25 grayscale'}`}
            style={{ fontSize: size }}
          >
            {icon}
          </span>
        ) : (
          <X
            key={i}
            size={size}
            strokeWidth={4}
            aria-hidden="true"
            className={`transition-colors duration-300 ${i < lives ? 'text-red-500' : 'text-(--chip)'}`}
          />
        ),
      )}
    </div>
  )
}
