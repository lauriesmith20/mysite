import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-(--ink) transition hover:bg-(--chip)"
    >
      <ArrowLeft size={26} aria-hidden="true" />
    </Link>
  )
}
