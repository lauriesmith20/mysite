import { useEffect, useState } from 'react'
import GuestHeader from '../shared/layout/GuestHeader'
import Tile from '../components/Tile'
import { autoSignIn } from '../lib/returningUser'
import { listPublicTiles, type Tile as TileData } from '../lib/tiles'

// Home for signed-out visitors: only guest-friendly (public) tiles, plus a way to sign in.
export default function GuestHomePage() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [loading, setLoading] = useState(true)

  // Someone who has signed in here before is sent straight back to Microsoft (once per tab session).
  useEffect(() => {
    autoSignIn()
  }, [])

  useEffect(() => {
    listPublicTiles()
      .then(setTiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <GuestHeader />
      <main className="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-1 md:px-12 md:pt-6">
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:mt-6 md:text-6xl">Welcome</h1>
        <p className="mt-2 text-(--soft)">Try these out. Sign in for the rest.</p>

        {loading ? (
          <p className="mt-8 text-(--soft)">Loading…</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3.5 md:mt-10 md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] md:gap-6">
            {tiles.map((tile) => (
              <Tile key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
