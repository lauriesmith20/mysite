import { ArrowLeftRight, Minus, Plus } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Page from '../shared/layout/Page'
import {
  loadWorld,
  MAP_HEIGHT,
  MAP_WIDTH,
  shortestRoutes,
  type Country,
  type World,
} from '../lib/countryGraph'

const FROM_COLOR = '#EC4060'
const TO_COLOR = '#4A5BE0'
const ROUTE_COLOR = '#F2C85A'
const OTHER_ROUTE_COLOR = '#F7E2A4'
const MAX_ZOOM = 40

interface View {
  k: number
  x: number
  y: number
}

// Zoom level beyond which the full-detail outlines replace the simplified ones.
const FINE_ZOOM = 4

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

// Frames every country on a shortest route so labels are readable straight away.
function fitView(world: World, from: number, to: number, h: number): View {
  const result = shortestRoutes(world.adjacency, from, to)
  if (!result) return homeView(h)
  const points = [...result.onAnyRoute].map((id) => world.countries[id].center)
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
  fine: boolean
}) {
  return (
    <>
      {countries.map((c) => (
        <path
          key={c.id}
          d={fine ? c.dFine : c.d}
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

export default function CountryHopperPage() {
  const [world, setWorld] = useState<World | null>(null)
  const [error, setError] = useState(false)
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const [selected, setSelected] = useState(0)
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const [viewH, setViewH] = useState(MAP_HEIGHT)
  const [unit, setUnit] = useState(1) // map units per CSS pixel, so lines/labels keep a fixed on-screen size
  const svgRef = useRef<SVGSVGElement>(null)
  const touched = useRef(false) // once the user moves the map we stop re-centring it on resize
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ moved: 0, startId: null as number | null, pinchDist: 0 })

  useEffect(() => {
    loadWorld()
      .then(setWorld)
      .catch(() => setError(true))
  }, [])

  const sortedCountries = useMemo(
    () => (world ? [...world.countries].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [world],
  )

  const options = useMemo(
    () =>
      sortedCountries.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      )),
    [sortedCountries],
  )

  const result = useMemo(
    () => (world && from !== null && to !== null ? shortestRoutes(world.adjacency, from, to) : null),
    [world, from, to],
  )
  const route = result?.routes[Math.min(selected, (result?.routes.length ?? 1) - 1)] ?? null

  const fills = useMemo(() => {
    const map = new Map<number, string>()
    result?.onAnyRoute.forEach((id) => map.set(id, OTHER_ROUTE_COLOR))
    route?.forEach((id) => map.set(id, ROUTE_COLOR))
    if (from !== null) map.set(from, FROM_COLOR)
    if (to !== null) map.set(to, TO_COLOR)
    return map
  }, [result, route, from, to])

  const nameOf = (id: number | null) => (id === null || !world ? null : world.countries[id].name)

  function applySelection(nextFrom: number | null, nextTo: number | null) {
    touched.current = true
    setFrom(nextFrom)
    setTo(nextTo)
    setSelected(0)
    if (world && nextFrom !== null && nextTo !== null && nextFrom !== nextTo) {
      setView(fitView(world, nextFrom, nextTo, viewH))
    }
  }

  function pick(id: number) {
    if (from === null || to !== null) applySelection(id, null)
    else if (id !== from) applySelection(from, id)
  }

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
      setView((v) => (touched.current ? clampView(v, h) : homeView(h)))
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
  }, [world, viewH])

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
    if (pointers.current.size === 1 && g.moved <= 6 && g.startId !== null) pick(g.startId)
    pointers.current.delete(e.pointerId)
    g.pinchDist = 0
  }

  function zoomBy(factor: number) {
    touched.current = true
    setView((v) => zoomAt(v, factor, MAP_WIDTH / 2, viewH / 2, viewH))
  }

  const strokeUnit = unit / view.k
  const polyline = (ids: number[]) =>
    world ? ids.map((id) => world.countries[id].center.map((n) => n.toFixed(1)).join(',')).join(' ') : ''
  const headline = result ? `${result.borders} border${result.borders === 1 ? '' : 's'} to cross` : ''

  return (
    <Page
      title="Country Hopper"
      subtitle="Pick two countries on the map and see the fewest land borders between them."
      subtitleClassName="hidden text-sm md:block"
      width="wide"
      contentClassName="flex flex-col gap-2.5 md:gap-3"
    >

      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 flex-col rounded-[18px] px-3.5 py-2 text-[#1b1220]" style={{ backgroundColor: FROM_COLOR }}>
          <span className="text-[11px] font-bold">From</span>
          <select
            value={from ?? ''}
            onChange={(e) => applySelection(e.target.value === '' ? null : Number(e.target.value), to)}
            className="w-full min-w-0 truncate bg-transparent text-[17px] font-extrabold outline-none"
          >
            <option value="">Tap a country</option>
            {options}
          </select>
        </label>
        <button
          type="button"
          aria-label="Swap countries"
          onClick={() => applySelection(to, from)}
          className={roundButton}
        >
          <ArrowLeftRight size={20} aria-hidden="true" />
        </button>
        <label className="flex min-w-0 flex-1 flex-col rounded-[18px] px-3.5 py-2 text-white" style={{ backgroundColor: TO_COLOR }}>
          <span className="text-[11px] font-bold">To</span>
          <select
            value={to ?? ''}
            onChange={(e) => applySelection(from, e.target.value === '' ? null : Number(e.target.value))}
            className="w-full min-w-0 truncate bg-transparent text-[17px] font-extrabold outline-none [&>option]:text-black"
          >
            <option value="">Tap a country</option>
            {options}
          </select>
        </label>
      </div>

      <div className="relative overflow-hidden rounded-[28px] bg-(--card) p-1.5 shadow-(--card-shadow)">
        {error ? (
          <p className="p-6 text-center text-(--soft)">Couldn't load the map. Refresh to try again.</p>
        ) : !world ? (
          <p className="p-6 text-center text-(--soft)">Loading map…</p>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MAP_WIDTH} ${viewH}`}
              role="img"
              aria-label="World map. Tap two countries, or use the From and To lists, to find the shortest land route."
              className="block h-[56svh] w-full touch-none select-none rounded-[20px] md:aspect-[960/500] md:h-auto"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                <g strokeWidth={0.8 * strokeUnit}>
                  <Land countries={world.countries} fills={fills} fine={view.k >= FINE_ZOOM} />
                </g>
                <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  {result?.routes.map((r, i) =>
                    i === selected ? null : (
                      <polyline key={i} points={polyline(r)} stroke="var(--ink)" strokeOpacity={0.28} strokeWidth={2.5 * strokeUnit} />
                    ),
                  )}
                  {route && (
                    <polyline
                      points={polyline(route)}
                      stroke="var(--ink)"
                      strokeWidth={3.5 * strokeUnit}
                      strokeDasharray={`${7 * strokeUnit} ${6 * strokeUnit}`}
                    />
                  )}
                </g>
                <g pointerEvents="none" textAnchor="middle" dominantBaseline="central">
                  {result &&
                    [...result.onAnyRoute].map((id) => (
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
                onClick={() => setView(homeView(viewH))}
                className="absolute bottom-5 left-5 h-9 rounded-full bg-(--chip) px-3.5 text-[13px] font-bold text-(--ink)"
              >
                Reset view
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-[22px] bg-[#8EC9F0] px-[18px] py-3.5 text-[#0E2233]" aria-live="polite">
        {from === null || to === null ? (
          <>
            <span className="text-xs font-bold">{from === null ? 'Tap the map' : `Starting from ${nameOf(from)}`}</span>
            <span className="text-[22px] font-extrabold">
              {from === null ? 'Pick two countries' : 'Now pick a destination'}
            </span>
          </>
        ) : from === to ? (
          <span className="text-[22px] font-extrabold">That's the same country!</span>
        ) : !result ? (
          <>
            <span className="text-xs font-bold">
              {nameOf(from)} → {nameOf(to)}
            </span>
            <span className="text-[22px] font-extrabold">No land route</span>
            <span className="text-sm">You can't get between these without crossing the sea.</span>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-xs font-bold">
                {result.totalRoutes} shortest route{result.totalRoutes === 1 ? '' : 's'}
              </span>
              <span className="text-xl font-extrabold">{headline}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {result.routes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === selected}
                  onClick={() => setSelected(i)}
                  className={`flex items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition active:scale-[0.99] ${
                    i === selected ? 'bg-white/95 ring-2 ring-[#0E2233]' : 'bg-white/45'
                  }`}
                >
                  <span className="shrink-0 text-[11px] font-extrabold opacity-70">{i + 1}</span>
                  <span className="text-[13px] font-extrabold leading-snug">
                    {r.map((id) => world!.countries[id].name).join(' → ')}
                  </span>
                </button>
              ))}
              {result.totalRoutes > result.routes.length && (
                <p className="text-xs font-semibold">+{result.totalRoutes - result.routes.length} more routes not listed</p>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          applySelection(null, null)
          setView(homeView(viewH))
        }}
        className="mt-1 h-[54px] rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
      >
        Clear selection
      </button>
    </Page>
  )
}
