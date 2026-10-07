import { Minus, Plus } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { loadFineOutlines, MAP_HEIGHT, MAP_WIDTH, type Country, type World } from '../lib/countryGraph'

const MAX_ZOOM = 40
// Zoom level beyond which the full-detail outlines replace the simplified ones.
const FINE_ZOOM = 8

interface View {
  k: number
  x: number
  y: number
}

// `h` is the visible height in map units: the viewport is MAP_WIDTH wide but can be taller than the
// 960x500 map (portrait phones), in which case the map is centred vertically when zoomed out.
function clampView(v: View, h: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k))
  const x = Math.min(0, Math.max(MAP_WIDTH - MAP_WIDTH * k, v.x))
  const mapH = MAP_HEIGHT * k
  const y = mapH <= h ? (h - mapH) / 2 : Math.min(0, Math.max(h - mapH, v.y))
  return { k, x, y }
}

// Default view: fill the available height (Europe/Africa centred) so portrait screens aren't mostly blank.
function homeView(h: number): View {
  const k = Math.max(1, h / MAP_HEIGHT)
  return clampView({ k, x: MAP_WIDTH / 2 - MAP_WIDTH * 0.53 * k, y: 0 }, h)
}

// Zooms by `factor` keeping the map point under (cx, cy) (in viewport units) fixed.
function zoomAt(v: View, factor: number, cx: number, cy: number, h: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor))
  const ratio = k / v.k
  return clampView({ k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio }, h)
}

// Frames the given countries so their labels are readable straight away.
function fitView(world: World, ids: number[], h: number): View {
  if (ids.length === 0) return homeView(h)
  const points = ids.map((id) => world.countries[id].center)
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const w = Math.max(Math.max(...xs) - Math.min(...xs), 60) + 80
  const ht = Math.max(Math.max(...ys) - Math.min(...ys), 40) + 60
  const k = Math.min(MAX_ZOOM, Math.max(1, Math.min(MAP_WIDTH / w, h / ht)))
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  return clampView({ k, x: MAP_WIDTH / 2 - cx * k, y: h / 2 - cy * k }, h)
}

const Land = memo(function Land({
  countries,
  fills,
  fine,
}: {
  countries: Country[]
  fills: Map<number, string>
  /** Full-detail outlines by country id, once zoomed in far enough to want them (and they've loaded). */
  fine: string[] | null
}) {
  return (
    <>
      {countries.map((c) => (
        <path
          key={c.id}
          d={fine ? fine[c.id] : c.d}
          data-id={c.id}
          fill={fills.get(c.id) ?? 'var(--land)'}
          stroke="var(--card)"
          strokeLinejoin="round"
          className="cursor-pointer"
        />
      ))}
    </>
  )
})

const roundButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition active:scale-[0.94]'

/** A line drawn through the centres of `ids`, in the order given. `width` is in screen pixels. */
export interface MapLine {
  ids: number[]
  stroke: string
  width: number
  opacity?: number
  dash?: [number, number]
}

/** Use as a country's fill to paint it with the diagonal stripes defined by the `hatch` prop. */
export const HATCH_FILL = 'url(#world-map-hatch)'

interface WorldMapProps {
  world: World
  /** Fill per country id; anything not listed uses the plain land colour. */
  fills: Map<number, string>
  lines?: MapLine[]
  /** Countries whose names are written on the map. */
  labelIds?: Iterable<number>
  /** Called when a country is tapped (not when the map is dragged). */
  onPick?: (id: number) => void
  /** Frames these countries whenever `key` changes; an empty list returns to the home view. */
  frame?: { ids: number[]; key: number }
  /** Colours for HATCH_FILL: stripes of `a` alternating with stripes of `b`. */
  hatch?: { a: string; b: string }
  ariaLabel: string
  svgClassName?: string
}

export default function WorldMap({
  world,
  fills,
  lines = [],
  labelIds = [],
  onPick,
  frame,
  hatch,
  ariaLabel,
  svgClassName = 'h-[56svh] md:aspect-[960/500] md:h-auto',
}: WorldMapProps) {
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const [viewH, setViewH] = useState(MAP_HEIGHT)
  const [unit, setUnit] = useState(1) // map units per CSS pixel, so lines/labels keep a fixed on-screen size
  const [appliedFrame, setAppliedFrame] = useState<number | undefined>(undefined)
  // Fetched the first time the map is zoomed in far enough; the coarse outlines are shown until it arrives.
  const [fineOutlines, setFineOutlines] = useState<string[] | null>(null)
  const wantsFine = view.k >= FINE_ZOOM
  useEffect(() => {
    if (wantsFine) loadFineOutlines().then(setFineOutlines, () => {})
  }, [wantsFine])
  const svgRef = useRef<SVGSVGElement>(null)
  const touched = useRef(false) // once the user moves the map we stop re-fitting it on resize
  const frameRef = useRef(frame)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ moved: 0, startId: null as number | null, pinchDist: 0 })

  // A new frame key means "go here": adjust the view while rendering rather than in an effect.
  if (frame && frame.key !== appliedFrame) {
    setAppliedFrame(frame.key)
    setView(fitView(world, frame.ids, viewH))
  }

  // Declared before the resize observer so a freshly framed view survives its first measurement.
  useEffect(() => {
    frameRef.current = frame
    if (frame) touched.current = false
  }, [frame])

  // Track the map's on-screen aspect ratio so it can fill a tall phone screen instead of letterboxing.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const measure = () => {
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0) return
      const h = MAP_WIDTH * (rect.height / rect.width)
      setViewH(h)
      setUnit(MAP_WIDTH / rect.width)
      setView((v) =>
        touched.current ? clampView(v, h) : frameRef.current ? fitView(world, frameRef.current.ids, h) : homeView(h),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [world])

  // Wheel zoom needs a non-passive listener so the page doesn't scroll underneath.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      touched.current = true
      const rect = svg.getBoundingClientRect()
      const cx = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH
      const cy = ((e.clientY - rect.top) / rect.height) * viewH
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.0015), cx, cy, viewH))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [viewH])

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (pointers.current.size === 1) {
      g.moved = 0
      const id = (e.target as SVGElement).dataset.id
      g.startId = id === undefined ? null : Number(id)
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      g.moved = 99
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const unit = MAP_WIDTH / rect.width
    const g = gesture.current
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (g.pinchDist > 0) {
        const cx = ((a.x + b.x) / 2 - rect.left) * unit
        const cy = ((a.y + b.y) / 2 - rect.top) * unit
        const factor = dist / g.pinchDist
        setView((v) => zoomAt(v, factor, cx, cy, viewH))
      }
      g.pinchDist = dist
      return
    }

    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    g.moved += Math.abs(dx) + Math.abs(dy)
    if (g.moved > 6) touched.current = true
    if (g.moved > 6) setView((v) => clampView({ ...v, x: v.x + dx * unit, y: v.y + dy * unit }, viewH))
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const g = gesture.current
    if (pointers.current.size === 1 && g.moved <= 6 && g.startId !== null) onPick?.(g.startId)
    pointers.current.delete(e.pointerId)
    g.pinchDist = 0
  }

  function zoomBy(factor: number) {
    touched.current = true
    setView((v) => zoomAt(v, factor, MAP_WIDTH / 2, viewH / 2, viewH))
  }

  const strokeUnit = unit / view.k
  const stripe = 7 * strokeUnit
  const polyline = (ids: number[]) =>
    ids.map((id) => world.countries[id].center.map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-(--card) p-1.5 shadow-(--card-shadow)">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${viewH}`}
        role="img"
        aria-label={ariaLabel}
        className={`block w-full touch-none select-none rounded-[20px] ${svgClassName}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {hatch && (
            <defs>
              <pattern
                id="world-map-hatch"
                width={stripe}
                height={stripe}
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width={stripe} height={stripe} fill={hatch.a} />
                <rect width={stripe / 2} height={stripe} fill={hatch.b} />
              </pattern>
            </defs>
          )}
          <g strokeWidth={0.8 * strokeUnit}>
            <Land countries={world.countries} fills={fills} fine={wantsFine ? fineOutlines : null} />
          </g>
          <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {lines.map((line, i) => (
              <polyline
                key={i}
                points={polyline(line.ids)}
                stroke={line.stroke}
                strokeOpacity={line.opacity}
                strokeWidth={line.width * strokeUnit}
                strokeDasharray={line.dash ? `${line.dash[0] * strokeUnit} ${line.dash[1] * strokeUnit}` : undefined}
              />
            ))}
          </g>
          <g pointerEvents="none" textAnchor="middle" dominantBaseline="central">
            {[...labelIds].map((id) => (
              <text
                key={id}
                x={world.countries[id].center[0]}
                y={world.countries[id].center[1]}
                fontSize={12 * strokeUnit}
                fontWeight={800}
                fill="#1b1220"
                stroke="rgb(255 255 255 / 0.7)"
                strokeWidth={3 * strokeUnit}
                paintOrder="stroke"
              >
                {world.countries[id].name}
              </text>
            ))}
          </g>
        </g>
      </svg>
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.6)} className={roundButton}>
          <Plus size={20} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.6)} className={roundButton}>
          <Minus size={20} aria-hidden="true" />
        </button>
      </div>
      {view.k > homeView(viewH).k + 0.05 && (
        <button
          type="button"
          onClick={() => {
            touched.current = true
            setView(homeView(viewH))
          }}
          className="absolute bottom-5 left-5 h-9 rounded-full bg-(--chip) px-3.5 text-[13px] font-bold text-(--ink)"
        >
          Reset view
        </button>
      )}
    </div>
  )
}
