import { X } from 'lucide-react'

/** Lives as a row of red Xs: the ones you still have in red, lost ones faded. */
export default function Lives({ lives, max, size = 28 }: { lives: number; max: number; size?: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${lives} of ${max} lives left`}>
      {Array.from({ length: max }, (_, i) => (
        <X
          key={i}
          size={size}
          strokeWidth={4}
          aria-hidden="true"
          className={`transition-colors duration-300 ${i < lives ? 'text-red-500' : 'text-(--chip)'}`}
        />
      ))}
    </div>
  )
}
