import type { SnailSpec } from './wakeSnails'

// A cartoon snail crawling left to right along a strip of grass, leaving a trail of slime. Below the grass is a
// cross-section of ground: brown mud fading into yellowy rock with bits, fading into nothing. Everything is drawn
// here and styled in index.css (.wake-*), so it stays small and sharp at any size.

const BLADES: [number, number][] = [
  [2, 4],
  [6, 3],
  [10, 5],
  [14, 3.5],
]
const GRASS_HEIGHT = 10

/** Very short blades of grass along the top of the ground. */
function Grass() {
  return (
    <svg className="relative z-0 block w-full" height={GRASS_HEIGHT} width="100%" aria-hidden="true">
      <defs>
        <pattern id="wake-grass" width="16" height={GRASS_HEIGHT} patternUnits="userSpaceOnUse">
          {BLADES.map(([x, h]) => (
            <path
              key={x}
              d={`M${x - 2} 5 Q${x} ${5 - h * 0.5} ${x + 0.3} ${5 - h} Q${x + 1} ${5 - h * 0.5} ${x + 2} 5Z`}
              fill="#6cc24f"
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={GRASS_HEIGHT} fill="url(#wake-grass)" />
      <rect width="100%" height="3" y="5" fill="#58b043" />
      <rect width="100%" height="2" y="8" fill="#2f7a35" />
    </svg>
  )
}

/**
 * The slime: a thin glossy line along the tips of the grass blades, so it hugs the spikes. It's full width and
 * drawn once, from the left, behind the snail, and then left there (see .wake-slime in index.css).
 */
/** `draw`: laid down behind the snail as it goes. `full`: already there. `clean`: there, and wiped up by the roller. */
export type SlimeMode = 'draw' | 'full' | 'clean'

function Slime({ mode }: { mode: SlimeMode }) {
  const outline = BLADES.map(
    ([x, h]) => `L${x - 2} 5 Q${x} ${5 - h * 0.5} ${x + 0.3} ${5 - h} Q${x + 1} ${5 - h * 0.5} ${x + 2} 5`,
  ).join(' ')
  return (
    <svg
      data-mode={mode}
      className="wake-slime absolute inset-0 z-[5] block"
      height={GRASS_HEIGHT}
      width="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern id="wake-slime" width="16" height={GRASS_HEIGHT} patternUnits="userSpaceOnUse">
          {/* only the upper part of each blade is slimed: the tips, not the base of the grass */}
          <clipPath id="wake-slime-tips">
            <rect x="0" y="0" width="16" height="3.4" />
          </clipPath>
          <path
            clipPath="url(#wake-slime-tips)"
            d={`M0 5 ${outline} L16 5`}
            fill="none"
            stroke="rgb(232 248 255 / 0.95)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height={GRASS_HEIGHT} fill="url(#wake-slime)" />
    </svg>
  )
}

const FLECKS: [number, number, number][] = [
  [8, 10, 1.4],
  [30, 26, 1.8],
  [52, 8, 1.2],
  [74, 38, 1.6],
  [14, 50, 1.5],
  [40, 64, 1.3],
  [66, 72, 1.9],
  [84, 18, 1.3],
  [22, 82, 1.6],
  [58, 90, 1.2],
]

const STONES: [number, number, number, number, string][] = [
  [18, 14, 5, 3.4, '#e9d9a0'],
  [70, 30, 3.5, 2.5, '#6e5326'],
  [40, 52, 6, 4, '#d8c27c'],
  [100, 62, 4, 3, '#7a5d2b'],
  [22, 88, 4.5, 3, '#6e5326'],
  [84, 100, 5.5, 3.6, '#efe3b0'],
  [120, 24, 3, 2.2, '#d8c27c'],
  [58, 112, 3.5, 2.4, '#7a5d2b'],
  [128, 90, 4.5, 3, '#e9d9a0'],
  [8, 118, 3, 2.2, '#d8c27c'],
]

/** Flecks (in the mud) or pebbles (in the rock), as a repeating tile. */
function Bits({ className, pebbles }: { className: string; pebbles?: boolean }) {
  const id = pebbles ? 'wake-pebbles' : 'wake-flecks'
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern
          id={id}
          width={pebbles ? 140 : 90}
          height={pebbles ? 130 : 100}
          patternUnits="userSpaceOnUse"
          patternTransform="scale(0.6)"
        >
          {pebbles
            ? STONES.map(([x, y, rx, ry, fill]) => (
                <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} fill={fill} />
              ))
            : FLECKS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#2b1809" />)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

const OUTLINE = '#5a3216'

/**
 * An almost invisible rectangle, bigger than the snail, put inside every animated group. Safari draws animated parts of
 * an SVG on their own layers and can clip them to the part's resting outline, which cut off the front eye and left
 * specks beside the head when the body stretched. A large box gives the layer room.
 */
function Room() {
  return <rect x="-40" y="-40" width="280" height="230" fill="#000" fillOpacity="0.004" stroke="none" />
}

/** The shell itself: its colour, highlight and swirl. */
function ShellShape({ spec }: { spec: SnailSpec }) {
  const { fill, highlight, swirl, outline } = spec.shell
  return (
    <g stroke={outline}>
      <circle cx="84" cy="80" r="52" fill={fill} />
      <path d="M44 56 A50 50 0 0 1 100 32" stroke={highlight} strokeWidth="6" fill="none" opacity="0.7" />
      <path
        d="M84 80 a6 6 0 0 1 12 0 a14 14 0 0 1 -28 0 a24 24 0 0 1 48 0 a34 34 0 0 1 -68 0 a44 44 0 0 1 88 0"
        fill="none"
        stroke={swirl}
        strokeWidth="4.5"
      />
    </g>
  )
}

function Snail({ spec }: { spec: SnailSpec }) {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full overflow-visible" aria-hidden="true">
      <g stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* the foot and its spots stretch as it moves (the head group below stretches the same way) */}
        <g className="wake-body">
          <Room />
          <path
            d="M6 140 Q30 128 70 126 L125 120 Q140 118 144 100 Q148 80 150 72 Q152 62 164 62 Q180 62 184 74 Q188 86 178 90 Q168 94 166 104 Q164 126 178 134 Q186 140 176 142 L24 142 Q10 143 6 140Z"
            fill={spec.skin}
          />
          <g stroke="none" fill={spec.skinShade}>
            <circle cx="40" cy="136" r="3.5" />
            <circle cx="70" cy="137" r="3" />
            <circle cx="100" cy="135" r="3.5" />
            <circle cx="152" cy="108" r="3" />
            <circle cx="158" cy="124" r="3.5" />
            <circle cx="156" cy="84" r="2.5" />
          </g>
          {spec.onFoot}
        </g>
        {/* shell: rises a little as the body contracts and settles as it stretches */}
        <g className="wake-shell">
          <Room />
          <ShellShape spec={spec} />
          {spec.onShell}
        </g>
        <g className="wake-body">
          <Room />
          {spec.behindStalks}
          {/* eye stalks */}
          <g className="wake-stalk">
            <Room />
            <path d="M158 66 Q152 46 150 32" fill="none" stroke={OUTLINE} strokeWidth="11" />
            <path d="M158 66 Q152 46 150 32" fill="none" stroke={spec.skin} strokeWidth="6" />
            <circle cx="148" cy="26" r="10.5" fill="#fff" />
            <circle cx="151" cy="26" r="4.5" fill="#2b1608" stroke="none" />
            {spec.onEyes?.[0]}
          </g>
          <g className="wake-stalk wake-stalk-2">
            <Room />
            <path d="M172 64 Q176 44 178 30" fill="none" stroke={OUTLINE} strokeWidth="11" />
            <path d="M172 64 Q176 44 178 30" fill="none" stroke={spec.skin} strokeWidth="6" />
            <circle cx="179" cy="24" r="10.5" fill="#fff" />
            <circle cx="182" cy="24" r="4.5" fill="#2b1608" stroke="none" />
            {spec.onEyes?.[1]}
          </g>
          {/* smile */}
          <path d="M166 82 Q176 94 186 80" fill="none" strokeWidth="2.5" />
          {spec.onHead}
          {/* the hand slot, on the midriff: a little hand holding whatever the snail carries */}
          {spec.onHand && (
            <g transform="translate(152 123)">
              {spec.onHand}
              <circle r="5.5" fill={spec.skin} strokeWidth="2.5" />
            </g>
          )}
        </g>
        {/* things that stay put on the ground while the body stretches (wheels) */}
        {spec.onGround}
      </g>
    </svg>
  )
}

/** A snail pulled into its shell, for rolling: just the shell. */
function Roller({ spec }: { spec: SnailSpec }) {
  return (
    <div className="flex h-full w-full items-end justify-center">
      <svg viewBox="30 26 108 108" className="wake-roll h-[39px] w-[39px]" aria-hidden="true">
        <g strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <ShellShape spec={spec} />
        </g>
      </svg>
    </div>
  )
}

/** One snail, drawn in a 72 by 54 pixel box (the box it crawls along in, and the gallery shows scaled up). */
export function SnailFigure({ spec }: { spec: SnailSpec }) {
  if (spec.roll) return <Roller spec={spec} />
  return (
    <div className="relative h-full w-full">
      <div className={`h-full w-full ${spec.flip ? '-scale-x-100' : ''}`}>
        <Snail spec={spec} />
      </div>
      {spec.alongside}
    </div>
  )
}

/**
 * The snail on the grass line with its slime trail, and a thin band of ground below that fades away. How fast it
 * goes comes from CSS variables set on a parent (see WakeOverlayView).
 */
export default function WakeScene({ spec, slime }: { spec: SnailSpec; slime: SlimeMode }) {
  // A rolling shell is smaller than a crawling snail, and sits lower so its bottom is on the grass.
  const box = spec.roll ? 'bottom-[-6.5px] h-[39px] w-[39px]' : 'bottom-[-9px] h-[54px] w-[72px]'
  return (
    <div className="relative w-full">
      <div className="relative h-[54px] w-full">
        <div className={`wake-crawler absolute left-0 z-10 ${box}`}>
          <SnailFigure spec={spec} />
        </div>
      </div>
      <div className="relative">
        <Grass />
        <Slime mode={slime} />
      </div>
      <div className="relative h-[max(11vh,72px)] w-full">
        <div className="wake-soil absolute inset-0" aria-hidden="true" />
        <Bits className="wake-flecks absolute inset-0" />
        <Bits pebbles className="wake-pebbles absolute inset-0" />
      </div>
    </div>
  )
}
