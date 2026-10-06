import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CountryFlag from '../components/CountryFlag'
import CountryPicker from '../components/CountryPicker'
import ScoreBurst from '../components/ScoreBurst'
import WorldMap, { HATCH_FILL, type MapLine } from '../components/WorldMap'
import { loadWorld, type World } from '../lib/countryGraph'
import {
  MAX_LIVES,
  MAX_SUITCASES,
  closestShortestRoute,
  dateKey,
  judgeGuess,
  pickDailyPuzzle,
  puzzleNumber,
  shareText,
  suitcasesFor,
  type Puzzle,
} from '../lib/countryHopperGame'
import { buildHopperWorld, type HopperWorld } from '../lib/hopperWorld'
import Page from '../shared/layout/Page'

const START_COLOR = '#EC4060'
const END_COLOR = '#4A5BE0'
const YOURS_COLOR = '#F2C85A'
const SHORTEST_COLOR = '#4CB87B'

type Status = 'playing' | 'won' | 'lost'

interface GameState {
  /** Country ids: the start, then every hop accepted so far. */
  path: number[]
  lives: number
  status: Status
}

// ── Saved progress (one game per day, so a refresh can't hand out fresh lives) ──────────────────

const STORAGE_PREFIX = 'country-hopper:'

function loadGame(day: string, names: string[], hopper: HopperWorld, puzzle: Puzzle): GameState | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + day) ?? 'null') as {
      path?: string[]
      lives?: number
    } | null
    if (!saved || !Array.isArray(saved.path) || typeof saved.lives !== 'number') return null
    const ids = saved.path.map((name) => names.indexOf(name))
    if (ids[0] !== puzzle.start) return null
    // Replay the saved route through the rules so a stale or edited entry can't leave a bad state.
    const path = [puzzle.start]
    for (const id of ids.slice(1)) {
      const outcome = judgeGuess(hopper.adjacency, path, puzzle.end, id)
      if (id < 0 || (outcome !== 'hop' && outcome !== 'win')) return null
      path.push(id)
    }
    const lives = Math.min(MAX_LIVES, Math.max(0, Math.floor(saved.lives)))
    const status: Status = path[path.length - 1] === puzzle.end ? 'won' : lives === 0 ? 'lost' : 'playing'
    return { path, lives, status }
  } catch {
    return null
  }
}

function saveGame(day: string, game: GameState, names: string[]) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const stored = localStorage.key(i)
      if (stored?.startsWith(STORAGE_PREFIX) && stored !== STORAGE_PREFIX + day) localStorage.removeItem(stored)
    }
    localStorage.setItem(
      STORAGE_PREFIX + day,
      JSON.stringify({ path: game.path.map((id) => names[id]), lives: game.lives }),
    )
  } catch {
    // storage unavailable: the game still works, it just won't survive a refresh
  }
}

// ── Pieces ───────────────────────────────────────────────────────────────────────────────────────

function Lives({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${lives} of ${MAX_LIVES} lives left`}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <X
          key={i}
          size={28}
          strokeWidth={4}
          aria-hidden="true"
          className={`transition-colors duration-300 ${i < lives ? 'text-red-500' : 'text-(--chip)'}`}
        />
      ))}
    </div>
  )
}

/** The big red X that flashes when a guess costs a life. Mount with a fresh `key` each time. */
function MissFlash() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 850)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
      <X className="hopper-x h-56 w-56 text-red-500 drop-shadow-lg" strokeWidth={3.5} />
    </div>
  )
}

function EndpointCard(props: { caption: string; name: string; code: string; color: string; light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-[20px] px-4 py-3 ${props.light ? 'text-white' : 'text-[#1b1220]'}`}
      style={{ backgroundColor: props.color }}
    >
      <CountryFlag code={props.code} className="h-8 w-12" />
      <div className="min-w-0">
        <span className="text-[11px] font-bold">{props.caption}</span>
        <span className="block truncate text-[22px] font-extrabold leading-tight">{props.name}</span>
      </div>
    </div>
  )
}

function Suitcases({ count }: { count: number }) {
  return (
    <div className="flex gap-1 text-4xl" role="img" aria-label={`${count} of ${MAX_SUITCASES} suitcases`}>
      {Array.from({ length: MAX_SUITCASES }, (_, i) => (
        <span key={i} className={i < count ? '' : 'opacity-25 grayscale'} aria-hidden="true">
          🧳
        </span>
      ))}
    </div>
  )
}

function LegendChip({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[13px] font-bold">
      <span className="h-4 w-4 rounded-[5px] shadow-[0_0_0_1px_rgb(0_0_0/0.15)]" style={{ background: swatch }} />
      {label}
    </span>
  )
}

// ── One day's round ──────────────────────────────────────────────────────────────────────────────

function Round({ world, hopper, puzzle, day }: { world: World; hopper: HopperWorld; puzzle: Puzzle; day: string }) {
  const names = useMemo(() => world.countries.map((c) => c.name), [world])
  const [game, setGame] = useState<GameState>(
    () => loadGame(day, names, hopper, puzzle) ?? { path: [puzzle.start], lives: MAX_LIVES, status: 'playing' },
  )
  const [message, setMessage] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [miss, setMiss] = useState(0)
  const [copied, setCopied] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => saveGame(day, game, names), [day, game, names])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [game.path.length])

  const label = (id: number) => hopper.labels[id]
  const current = game.path[game.path.length - 1]
  const borders = game.path.length - 1
  const visited = useMemo(() => new Set(game.path), [game.path])
  const playing = game.status === 'playing'
  const suitcases = game.status === 'won' ? suitcasesFor(puzzle.shortest, borders) : 0

  function submit(id: number) {
    if (!playing) return
    const outcome = judgeGuess(hopper.adjacency, game.path, puzzle.end, id)
    if (outcome === 'repeat') {
      setMessage(`${label(id)} is already on your route.`)
      setShake((n) => n + 1)
    } else if (outcome === 'invalid') {
      const lives = game.lives - 1
      setGame({ ...game, lives, status: lives === 0 ? 'lost' : 'playing' })
      setMessage(`${label(id)} doesn't border ${label(current)}. You lost a life.`)
      setMiss((n) => n + 1)
      setShake((n) => n + 1)
    } else {
      setMessage(null)
      setGame({ ...game, path: [...game.path, id], status: outcome === 'win' ? 'won' : 'playing' })
    }
  }

  function noMatch(text: string) {
    setMessage(`There's no country called "${text}".`)
    setShake((n) => n + 1)
  }

  async function share() {
    const text = shareText({
      number: puzzleNumber(day),
      suitcases,
      livesLeft: game.lives,
      url: `${window.location.origin}${import.meta.env.BASE_URL}#/country-hopper`,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your result:', text)
    }
  }

  // Result map: your route in gold, the closest shortest route in green, hatched where they overlap.
  const shortestRoute = useMemo(
    () => (playing ? [] : closestShortestRoute(hopper.adjacency, puzzle.start, puzzle.end, game.path)),
    [playing, hopper, puzzle, game.path],
  )
  const fills = useMemo(() => {
    const map = new Map<number, string>()
    const yours = new Set(game.path)
    const shortest = new Set(shortestRoute)
    yours.forEach((id) => map.set(id, shortest.has(id) ? HATCH_FILL : YOURS_COLOR))
    shortest.forEach((id) => {
      if (!yours.has(id)) map.set(id, SHORTEST_COLOR)
    })
    map.set(puzzle.start, START_COLOR)
    map.set(puzzle.end, END_COLOR)
    return map
  }, [game.path, shortestRoute, puzzle])
  const lines = useMemo<MapLine[]>(
    () => [
      { ids: game.path, stroke: '#B8860B', width: 3 },
      { ids: shortestRoute, stroke: '#1F7A4A', width: 3.5, dash: [7, 6] },
    ],
    [game.path, shortestRoute],
  )
  const framed = useMemo(
    () => ({ ids: [...new Set([...game.path, ...shortestRoute])], key: 1 }),
    [game.path, shortestRoute],
  )

  return (
    <div className="flex flex-col gap-3">
      {miss > 0 && <MissFlash key={miss} />}

      {/* While playing, this block fills the screen height (never less than 34rem, which leaves the
          hops list room for 5 rows) so the list scrolls inside it and the typing bar stays in view. */}
      <div className={`flex flex-col gap-3 ${playing ? 'h-[max(34rem,calc(100svh-13.5rem))]' : ''}`}>
        <div className="flex items-center justify-between">
          <Lives lives={game.lives} />
          <span className="text-sm font-bold text-(--soft)">
            {borders} hop{borders === 1 ? '' : 's'}
          </span>
        </div>

        <EndpointCard
          caption="Start"
          name={label(puzzle.start)}
          code={hopper.codes[puzzle.start]}
          color={START_COLOR}
        />

        <ol
          ref={listRef}
          aria-label="Hops so far"
          className={`flex min-h-[15.5rem] flex-col gap-1 overflow-y-auto rounded-[22px] bg-(--card) p-2 shadow-(--card-shadow) ${
            playing ? 'flex-1' : 'max-h-[26rem]'
          }`}
        >
          {borders === 0 ? (
            <li className="m-auto max-w-[16rem] p-4 text-center text-[15px] font-semibold text-(--soft)">
              Your route starts here. Type a country that borders {label(puzzle.start)}.
            </li>
          ) : (
            game.path.slice(1).map((id, i) => (
              <li
                key={id}
                className={`flex items-center gap-3 rounded-[14px] px-3 py-2 ${
                  id === current && playing ? 'bg-(--chip)' : ''
                }`}
              >
                <span className="w-5 shrink-0 text-center text-sm font-extrabold text-(--soft)">{i + 1}</span>
                <CountryFlag code={hopper.codes[id]} className="h-6 w-9" />
                <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{label(id)}</span>
              </li>
            ))
          )}
        </ol>

        <EndpointCard
          caption="Destination"
          name={label(puzzle.end)}
          code={hopper.codes[puzzle.end]}
          color={END_COLOR}
          light
        />

        {playing && (
          <>
            <p className="min-h-5 text-center text-sm font-bold text-(--soft)" aria-live="polite">
              {message}
            </p>
            <CountryPicker
              candidates={hopper.candidates}
              codeOf={(id) => hopper.codes[id]}
              visited={visited}
              onSubmit={submit}
              onNoMatch={noMatch}
              shake={shake}
            />
          </>
        )}
      </div>

      {!playing && (
        <>
          <section className="relative flex flex-col items-center gap-3 rounded-[24px] bg-(--card) p-5 text-center shadow-(--card-shadow)">
            {game.status === 'won' && <ScoreBurst kind="confetti" />}
            <h2 className="text-2xl font-extrabold">{game.status === 'won' ? 'You made it!' : 'Out of lives'}</h2>
            <Suitcases count={suitcases} />
            <p className="text-[15px] font-semibold text-(--soft)">
              {game.status === 'won'
                ? borders === puzzle.shortest
                  ? `${borders} borders: the shortest possible route!`
                  : `${borders} borders. The shortest route is ${puzzle.shortest}.`
                : `The shortest route was ${puzzle.shortest} borders.`}
            </p>
            <button
              type="button"
              onClick={share}
              className="h-[54px] w-full rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
            >
              {copied ? 'Copied to clipboard!' : 'Share result'}
            </button>
            <p className="text-xs font-semibold text-(--soft)">A new puzzle arrives tomorrow.</p>
          </section>

          <WorldMap
            world={world}
            fills={fills}
            lines={lines}
            labelIds={framed.ids}
            frame={framed}
            hatch={{ a: YOURS_COLOR, b: SHORTEST_COLOR }}
            svgClassName="h-[48svh] md:aspect-[960/500] md:h-auto"
            ariaLabel="World map showing your route in gold and the shortest route in green."
          />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <LegendChip swatch={YOURS_COLOR} label="Your route" />
            <LegendChip swatch={SHORTEST_COLOR} label="Shortest route" />
            <LegendChip
              swatch={`repeating-linear-gradient(45deg, ${YOURS_COLOR} 0 4px, ${SHORTEST_COLOR} 4px 8px)`}
              label="Both"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────────────────────

export default function CountryHopperPage() {
  const [world, setWorld] = useState<World | null>(null)
  const [error, setError] = useState(false)
  const [params] = useSearchParams()
  // Dev builds can preview any day's puzzle with ?date=YYYY-MM-DD.
  const day = (import.meta.env.DEV && params.get('date')) || dateKey()

  useEffect(() => {
    loadWorld()
      .then(setWorld)
      .catch(() => setError(true))
  }, [])

  const hopper = useMemo(() => (world ? buildHopperWorld(world) : null), [world])
  const puzzle = useMemo(() => (hopper ? pickDailyPuzzle(hopper.adjacency, day) : null), [hopper, day])

  return (
    <Page
      title="Country Hopper"
      subtitle={`Daily puzzle #${puzzleNumber(day)}: hop from border to border to reach the destination.`}
      subtitleClassName="text-sm"
    >
      {error ? (
        <p className="text-center text-(--soft)">Couldn't load the map. Refresh to try again.</p>
      ) : !world || !hopper ? (
        <p className="text-center text-(--soft)">Loading map…</p>
      ) : !puzzle ? (
        <p className="text-center text-(--soft)">Couldn't set today's puzzle. Try again later.</p>
      ) : (
        <Round key={day} world={world} hopper={hopper} puzzle={puzzle} day={day} />
      )}
    </Page>
  )
}
