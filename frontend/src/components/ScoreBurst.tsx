import { useEffect, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'

const CONFETTI_COLOURS = ['#f09a52', '#ef476f', '#ffd166', '#06d6a0', '#4361ee', '#b388eb']
const DURATION_MS = 1000

interface Particle {
  dx: number
  dy: number
  rot: number
  size: number
  colour: string
  duration: number
}

const between = (min: number, max: number) => min + Math.random() * (max - min)

function makeParticles(kind: 'confetti' | 'miss'): Particle[] {
  if (kind === 'confetti') {
    return Array.from({ length: 22 }, () => ({
      dx: between(-120, 120),
      dy: between(-140, 30),
      rot: between(-720, 720),
      size: between(6, 11),
      colour: CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
      duration: between(700, DURATION_MS),
    }))
  }
  return Array.from({ length: 7 }, () => ({
    dx: between(-70, 70),
    dy: between(-100, -30),
    rot: between(-25, 25),
    size: between(18, 30),
    colour: '#ef4444',
    duration: between(700, 900),
  }))
}

/**
 * One-shot particle effect centred on its (relatively positioned) parent: confetti for a point
 * to yourself, red crosses for a point to someone else. Mount it with a fresh `key` per score.
 */
export default function ScoreBurst({ kind }: { kind: 'confetti' | 'miss' }) {
  const [particles] = useState(() => makeParticles(kind))
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), DURATION_MS + 100)
    return () => clearTimeout(timer)
  }, [])

  if (done) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {particles.map((p, i) => {
        const style = {
          '--dx': `${p.dx}px`,
          '--dy': `${p.dy}px`,
          '--rot': `${p.rot}deg`,
          '--dur': `${p.duration}ms`,
        } as CSSProperties
        return kind === 'confetti' ? (
          <span
            key={i}
            className="score-burst-particle absolute rounded-[2px]"
            style={{ ...style, width: p.size * 0.7, height: p.size, background: p.colour }}
          />
        ) : (
          <X
            key={i}
            className="score-burst-particle absolute"
            style={{ ...style, width: p.size, height: p.size, color: p.colour }}
            strokeWidth={3.5}
          />
        )
      })}
    </div>
  )
}
