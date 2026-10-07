import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useBackendWaking } from '../lib/backendStatus'
import WakeScene, { type SlimeMode } from './WakeScene'
import { randomSnail, SNAILS, type SnailSpec } from './wakeSnails'

/** A rolling shell turns once per 2π times its radius (about 18.7px on screen) of the way across. */
const ROLL_RADIUS_PX = 18.7
const ROLLER_WIDTH_PX = 39

/**
 * The waking-up screen itself. `className` positions it (full screen by default). `loop` makes the snail cross again
 * and again; the parade turns that off and sets the slime itself.
 */
export function WakeOverlayView({
  className = 'fixed inset-0 z-[70]',
  spec = SNAILS[0],
  slime,
  loop = true,
  children,
}: {
  className?: string
  spec?: SnailSpec
  slime?: SlimeMode
  loop?: boolean
  children?: ReactNode
}) {
  const turns = (window.innerWidth + ROLLER_WIDTH_PX) / (2 * Math.PI * ROLL_RADIUS_PX)
  const style = {
    '--wake-cross': `${spec.crossSeconds}s`,
    '--wake-stretch': `${spec.stretchSeconds ?? 1.4}s`,
    '--wake-loops': loop ? 'infinite' : '1',
    '--wake-roll': `${Math.round(turns * 360)}deg`,
  } as CSSProperties
  return (
    <div
      role="status"
      aria-live="polite"
      className={`wake-overlay ${className} overflow-hidden bg-black/75`}
      style={style}
    >
      {/* The grass line sits a third of the way down; the snail's lane (54px) is above it. */}
      <div className="absolute inset-x-0 top-[calc(36%-54px)]">
        <WakeScene key={spec.id} spec={spec} slime={slime ?? (spec.roll ? 'clean' : 'draw')} />
      </div>
      <div className="absolute inset-x-0 top-[50%] flex flex-col gap-3 px-4 text-center">
        <p className="text-[clamp(1.25rem,6.6vw,3.75rem)] leading-tight font-extrabold whitespace-nowrap text-white">
          Getting things started…
        </p>
        <p className="text-base font-semibold text-white/80 md:text-xl">Hang tight, this can take up to 20 seconds</p>
        {children}
      </div>
    </div>
  )
}

/** How long to wait after a snail has crossed before the next one starts. */
const GAP_MS = 600

/** The snail the last waking-up screen ended on, so the next one doesn't open with the same one. */
let lastShownId: string | null = null

/**
 * The overlay as a little show: a random snail crosses, then another, for as long as it's up. The first snail lays the
 * slime, later ones walk over it, and when the rolling shell comes along it wipes it up (so slime is laid again).
 */
export function RandomSnailOverlay({ className }: { className?: string }) {
  const [now, setNow] = useState(() => ({ spec: randomSnail(false, lastShownId), slimeOnGrass: false }))

  useEffect(() => {
    lastShownId = now.spec.id
    const timer = setTimeout(
      () => {
        // Slime is on the grass unless the snail that just crossed was the roller.
        const slimeOnGrass = !now.spec.roll
        setNow({ spec: randomSnail(slimeOnGrass, now.spec.id), slimeOnGrass })
      },
      now.spec.crossSeconds * 1000 + GAP_MS,
    )
    return () => clearTimeout(timer)
  }, [now])

  const slime: SlimeMode = now.spec.roll ? 'clean' : now.slimeOnGrass ? 'full' : 'draw'
  return <WakeOverlayView className={className} spec={now.spec} slime={slime} loop={false} />
}

/**
 * Shown over the whole app while it waits on a backend that's starting up, so a slow feature reads as "getting
 * things started" rather than "broken". It also blocks taps, since nothing can work until the backend is up.
 */
export default function WakeOverlay() {
  const waking = useBackendWaking()
  return waking ? <RandomSnailOverlay /> : null
}
