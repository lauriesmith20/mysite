import { House, LogOut, Menu, PlayingCards, Settings, X } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthGate'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/game-scores', label: 'Game Scores', icon: PlayingCards },
]

const linkClassName =
  'mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-white transition hover:bg-white/10 md:mx-0 md:h-12 md:w-12 md:justify-center md:px-0 md:py-0'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { me, signOut } = useAuth()

  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden dark:border-gray-800 dark:bg-gray-950">
        <Link
          to="/"
          onClick={() => setIsOpen(false)}
          aria-label="Home"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <House aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </header>

      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-40 flex w-56 -translate-x-full flex-col justify-between gap-1 bg-[#66B2FF] py-4 transition-transform duration-200 md:w-16 md:translate-x-0 md:items-center ${
          isOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex flex-col gap-1 md:items-center md:gap-4">
          {navItems.map(({ to, label, icon: Icon }, index) => (
            <Fragment key={to}>
              <Link
                to={to}
                onClick={() => setIsOpen(false)}
                aria-label={label}
                title={label}
                className={linkClassName}
              >
                <Icon aria-hidden="true" />
                <span className="md:hidden">{label}</span>
              </Link>
              {index === 0 && <hr className="mx-4 my-2 w-auto border-t border-white/70 md:mx-0 md:w-8" />}
            </Fragment>
          ))}
        </div>

        <div className="flex flex-col gap-1 md:items-center md:gap-2">
          {me.is_admin && (
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              aria-label="Settings"
              title="Settings"
              className={linkClassName}
            >
              <Settings aria-hidden="true" />
              <span className="md:hidden">Settings</span>
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className={linkClassName}
          >
            <LogOut aria-hidden="true" />
            <span className="md:hidden">Sign out</span>
          </button>
        </div>
      </nav>
    </>
  )
}
