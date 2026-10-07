import { useEffect } from 'react'
import GuestHeader from '../shared/layout/GuestHeader'
import Tile from '../components/Tile'
import { autoSignIn } from '../lib/returningUser'
import { GUEST_TILES } from '../lib/tiles'

// Home for signed-out visitors: only guest-friendly (public) tiles, plus a way to sign in.
export default function GuestHomePage() {
  // Someone who has signed in here before is sent straight back to Microsoft (once per tab session).
  useEffect(() => {
    autoSignIn()
  }, [])

  return (
    <>
      <GuestHeader />
      <main className="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-1 md:px-12 md:pt-6">
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:mt-6 md:text-6xl">Welcome</h1>
        <p className="mt-2 text-(--soft)">Try these out. Sign in for the rest.</p>

        <div className="mt-6 grid grid-cols-2 gap-3.5 md:mt-10 md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] md:gap-6">
          {GUEST_TILES.map((tile) => (
            <Tile key={tile.href} tile={tile} />
          ))}
        </div>
      </main>
    </>
  )
}
