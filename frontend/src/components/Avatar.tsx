interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, color, size = 'md' }: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
