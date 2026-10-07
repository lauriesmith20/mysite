import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WakeOverlayView } from '../components/WakeOverlay'
import type { SlimeMode } from '../components/WakeScene'
import { SNAILS } from '../components/wakeSnails'

/** How long to wait after a snail has crossed before the next one starts. */
const GAP_MS = 800

const button = 'rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black'

/**
 * Dev only (/snail-parade): the waking-up screen with the whole series crossing one by one. The first snail lays the
 * slime, the others walk over it, and the rolling shell at the end wipes it up before the parade starts again.
 */
export default function SnailParadePage() {
  const [index, setIndex] = useState(0)
  const [auto, setAuto] = useState(true)
  const spec = SNAILS[index]

  useEffect(() => {
    if (!auto) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SNAILS.length), spec.crossSeconds * 1000 + GAP_MS)
    return () => clearTimeout(timer)
  }, [index, auto, spec])

  const slime: SlimeMode = spec.roll ? 'clean' : index === 0 ? 'draw' : 'full'
  const step = (by: number) => setIndex((i) => (i + by + SNAILS.length) % SNAILS.length)

  return (
    <div className="relative h-svh">
      <WakeOverlayView key={spec.id} className="absolute inset-0" spec={spec} slime={slime} loop={false}>
        <p className="mt-1 text-sm font-bold text-white/60">
          {index + 1} of {SNAILS.length}: {spec.name}
        </p>
      </WakeOverlayView>
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        <Link to="/" className={button}>
          Exit
        </Link>
        <button type="button" className={button} onClick={() => step(-1)}>
          Previous
        </button>
        <button type="button" className={button} onClick={() => step(1)}>
          Next
        </button>
        <button type="button" className={button} onClick={() => setAuto((on) => !on)}>
          {auto ? 'Stop auto-advance' : 'Auto-advance'}
        </button>
      </div>
    </div>
  )
}
