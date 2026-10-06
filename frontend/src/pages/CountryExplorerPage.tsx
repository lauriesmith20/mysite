import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Page from '../shared/layout/Page'
import WorldMap, { type MapLine } from '../components/WorldMap'
import { loadWorld, shortestRoutes, type World } from '../lib/countryGraph'

const FROM_COLOR = '#EC4060'
const TO_COLOR = '#4A5BE0'
const ROUTE_COLOR = '#F2C85A'
const OTHER_ROUTE_COLOR = '#F7E2A4'

const roundButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition active:scale-[0.94]'

/** The free-play tool: pick any two countries and see the fewest land borders between them. */
export default function CountryExplorerPage() {
  const [world, setWorld] = useState<World | null>(null)
  const [error, setError] = useState(false)
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const [selected, setSelected] = useState(0)
  const [frame, setFrame] = useState<{ ids: number[]; key: number }>({ ids: [], key: 0 })

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

  const lines = useMemo(() => {
    const out: MapLine[] = []
    result?.routes.forEach((r, i) => {
      if (i !== selected) out.push({ ids: r, stroke: 'var(--ink)', opacity: 0.28, width: 2.5 })
    })
    if (route) out.push({ ids: route, stroke: 'var(--ink)', width: 3.5, dash: [7, 6] })
    return out
  }, [result, route, selected])

  const nameOf = (id: number | null) => (id === null || !world ? null : world.countries[id].name)

  function reframe(ids: number[]) {
    setFrame((f) => ({ ids, key: f.key + 1 }))
  }

  function applySelection(nextFrom: number | null, nextTo: number | null) {
    setFrom(nextFrom)
    setTo(nextTo)
    setSelected(0)
    if (world && nextFrom !== null && nextTo !== null && nextFrom !== nextTo) {
      const found = shortestRoutes(world.adjacency, nextFrom, nextTo)
      reframe(found ? [...found.onAnyRoute] : [])
    }
  }

  function pick(id: number) {
    if (from === null || to !== null) applySelection(id, null)
    else if (id !== from) applySelection(from, id)
  }

  const headline = result ? `${result.borders} border${result.borders === 1 ? '' : 's'} to cross` : ''

  return (
    <Page
      title="Route explorer"
      subtitle="Pick two countries on the map and see the fewest land borders between them."
      subtitleClassName="hidden text-sm md:block"
      back={{ to: '/country-hopper', label: 'Back to the daily game' }}
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

      {error ? (
        <p className="rounded-[28px] bg-(--card) p-6 text-center text-(--soft) shadow-(--card-shadow)">
          Couldn't load the map. Refresh to try again.
        </p>
      ) : !world ? (
        <p className="rounded-[28px] bg-(--card) p-6 text-center text-(--soft) shadow-(--card-shadow)">Loading map…</p>
      ) : (
        <WorldMap
          world={world}
          fills={fills}
          lines={lines}
          labelIds={result?.onAnyRoute}
          onPick={pick}
          frame={frame}
          ariaLabel="World map. Tap two countries, or use the From and To lists, to find the shortest land route."
        />
      )}

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
          reframe([])
        }}
        className="mt-1 h-[54px] rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
      >
        Clear selection
      </button>
    </Page>
  )
}
