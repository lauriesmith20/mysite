import { House, LogOut, Menu, Moon, Settings, Sun, User, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthGate'
import { tilesFor } from '../../lib/tiles'
import { useTheme } from '../../lib/theme'

const iconButton =
  'flex h-11 w-11 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition hover:brightness-95'
const navLink =
  'rounded-full px-3.5 py-2.5 text-base font-semibold text-(--ink) transition hover:bg-[rgb(128_120_150/0.18)]'
const menuLink =
  'flex h-12 items-center gap-3 rounded-2xl px-3 text-base font-semibold text-(--ink) hover:bg-[rgb(128_120_150/0.18)]'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { me, signOut } = useAuth()
  const { dark, toggle } = useTheme()
  const close = () => setIsOpen(false)
  const tiles = tilesFor(me)

  const themeButton = (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={iconButton}
    >
      {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
    </button>
  )

  return (
    <header className="relative z-40">
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-12">
        <div className="flex items-center gap-7">
          <Link
            to="/"
            onClick={close}
            aria-label="Home"
            className="flex h-11 items-center gap-2.5 text-xl font-extrabold text-(--ink)"
          >
            <House size={26} aria-hidden="true" />
            <span className="hidden md:inline">Laurie's Website</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {tiles.map((tile) => (
              <NavLink key={tile.href} to={tile.href} className={navLink}>
                {tile.title}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {themeButton}
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/profile" aria-label="Profile" title="Profile" className={iconButton}>
              <User size={22} aria-hidden="true" />
            </Link>
            {me.is_admin && (
              <Link to="/settings" aria-label="Settings" title="Settings" className={iconButton}>
                <Settings size={22} aria-hidden="true" />
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className={iconButton}
            >
              <LogOut size={22} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center text-(--ink) md:hidden"
          >
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav
          aria-label="Menu"
          className="absolute inset-x-3 top-full flex flex-col gap-1 rounded-3xl bg-(--bg) p-3 shadow-(--tile-shadow) ring-1 ring-black/5 md:hidden dark:ring-white/10"
        >
          {tiles.map((tile) => (
            <Link key={tile.href} to={tile.href} onClick={close} className={menuLink}>
              {tile.title}
            </Link>
          ))}
          <hr className="my-1 border-t border-black/10 dark:border-white/10" />
          <Link to="/profile" onClick={close} className={menuLink}>
            <User size={20} aria-hidden="true" /> Profile
          </Link>
          {me.is_admin && (
            <Link to="/settings" onClick={close} className={menuLink}>
              <Settings size={20} aria-hidden="true" /> Settings
            </Link>
          )}
          <button type="button" onClick={signOut} className={menuLink}>
            <LogOut size={20} aria-hidden="true" /> Sign out
          </button>
        </nav>
      )}
    </header>
  )
}
