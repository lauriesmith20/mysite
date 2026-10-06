import { useEffect, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'

const CONFETTI_COLOURS = ['#f09a52', '#ef476f', '#ffd166', '#06d6a0', '#4361ee', '#b388eb']
const DURATION_MS = 1800
const BIG_DURATION_MS = 4200

interface Particle {
  dx: number
  dy: number
  rot: number
  size: number
  colour: string
  duration: number
  sway: number
  fall: number
}

const between = (min: number, max: number) => min + Math.random() * (max - min)

/** Fills the screen: a hard burst from the middle, then everything sinks past the bottom edge. */
function makeBigParticles(kind: 'confetti' | 'miss'): Particle[] {
  const w = window.innerWidth
  const h = window.innerHeight
  const confetti = kind === 'confetti'
  return Array.from({ length: confetti ? 110 : 34 }, () => ({
    dx: between(-0.5, 0.5) * w * (confetti ? 1.1 : 0.9),
    dy: between(-0.5, 0.1) * h,
    rot: between(-900, 900),
    size: confetti ? between(9, 18) : between(36, 80),
    colour: confetti ? CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)] : '#ef4444',
    duration: between(2600, BIG_DURATION_MS),
    sway: between(-80, 80),
    fall: between(0.5, 1) * h,
  }))
}

function makeParticles(kind: 'confetti' | 'miss', big: boolean): Particle[] {
  if (big) return makeBigParticles(kind)
  if (kind === 'confetti') {
    return Array.from({ length: 56 }, () => ({
      dx: between(-130, 130),
      dy: between(-150, 20),
      rot: between(-720, 720),
      size: between(6, 11),
      colour: CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
      duration: between(1100, DURATION_MS),
      sway: between(-30, 30),
      fall: between(60, 150),
    }))
  }
  return Array.from({ length: 16 }, () => ({
    dx: between(-80, 80),
    dy: between(-110, -20),
    rot: between(-25, 25),
    size: between(18, 30),
    colour: '#ef4444',
    duration: between(1100, 1600),
    sway: between(-20, 20),
    fall: between(50, 120),
  }))
}

/**
 * One-shot particle effect centred on its (relatively positioned) parent: confetti for a point
 * to yourself, red crosses for a point to someone else (`big` for the full-screen reveal). Mount it with a fresh `key` per score.
 */
export default function ScoreBurst({ kind, big = false }: { kind: 'confetti' | 'miss'; big?: boolean }) {
  const [particles] = useState(() => makeParticles(kind, big))
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), (big ? BIG_DURATION_MS : DURATION_MS) + 100)
    return () => clearTimeout(timer)
  }, [])

  if (done) return null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {particles.map((p, i) => {
        const style = {
          '--dx': `${p.dx}px`,
          '--dy': `${p.dy}px`,
          '--rot': `${p.rot}deg`,
          '--dur': `${p.duration}ms`,
          '--sway': `${p.sway}px`,
          '--fall': `${p.fall}px`,
        } as CSSProperties
        return kind === 'confetti' ? (
          <span
            key={i}
            className="score-burst-particle score-burst-big absolute rounded-[2px]"
            style={{ ...style, width: p.size * 0.7, height: p.size, background: p.colour }}
          />
        ) : (
          <X
            key={i}
            className="score-burst-particle score-burst-big absolute"
            style={{ ...style, width: p.size, height: p.size, color: p.colour }}
            strokeWidth={3.5}
          />
        )
      })}
    </div>
  )
}
