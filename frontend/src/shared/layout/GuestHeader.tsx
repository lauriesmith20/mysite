import { Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { signIn } from '../../lib/returningUser'
import { useTheme } from '../../lib/theme'

// Top bar for signed-out visitors (the signed-in equivalent is Sidebar).
export default function GuestHeader() {
  const { dark, toggle } = useTheme()
  return (
    <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-5 py-4 md:px-12">
      {/* A router Link, not href="/": the site lives under /mysite/, so a bare "/" is the host root. */}
      <Link to="/" className="text-xl font-extrabold text-(--ink)">
        Laurie's Website
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={signIn}
          className="h-11 rounded-full bg-(--ink) px-5 text-sm font-extrabold text-(--bg) transition active:scale-[0.97]"
        >
          Sign in
        </button>
        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip) text-(--ink)"
        >
          {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
