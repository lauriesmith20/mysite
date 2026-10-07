import { useState } from 'react'
import type { ShirtKit, ShirtPart } from '../lib/shirtGame'

// Wikipedia draws kits from tiny pixel images: a plain outline per part, and a pattern over a colour. They're
// left unsmoothed on purpose, so a shirt looks like 8-bit art. Sizes are the images' own (in pixels).
const PARTS: { part: ShirtPart; x: number; w: number }[] = [
  { part: 'la', x: 0, w: 31 },
  { part: 'b', x: 31, w: 38 },
  { part: 'ra', x: 69, w: 31 },
]
const WIDTH = 100
const HEIGHT = 59

function Layer({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setBroken(true)}
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** A pixel-art shirt in a kit's colours and pattern. */
export default function Shirt({ kit, className = '' }: { kit: ShirtKit; className?: string }) {
  const bodyColour = kit.colours.b ?? 'FFFFFF'
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      role="img"
      aria-label={`${kit.type} kit`}
    >
      {PARTS.map(({ part, x, w }) => (
        <div
          key={part}
          className="absolute top-0 h-full"
          style={{
            left: `${(x / WIDTH) * 100}%`,
            width: `${(w / WIDTH) * 100}%`,
            backgroundColor: `#${kit.colours[part] ?? bodyColour}`,
          }}
        >
          <Layer src={kit.patterns[part]} />
          <Layer src={kit.base[part]} />
        </div>
      ))}
    </div>
  )
}
