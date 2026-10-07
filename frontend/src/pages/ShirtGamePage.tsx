import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DailyScore from '../components/DailyScore'
import Lives from '../components/Lives'
import MissFlash from '../components/MissFlash'
import RivalsToday from '../components/RivalsToday'
import ScoreBurst from '../components/ScoreBurst'
import Shirt from '../components/Shirt'
import TickFlash from '../components/TickFlash'
import { DAILY_GAMES } from '../lib/dailyGameRegistry'
import {
  deleteResultDev,
  getResult,
  listRivalsForDay,
  localDateKey,
  submitResult,
  type DailyGameResult,
  type RivalToday,
} from '../lib/dailyGames'
import {
  GAME_KEY,
  MAX_LIVES,
  STAGES,
  getShirtAnswer,
  getShirtPuzzle,
  guess,
  shareText,
  type ShirtAnswer,
  type ShirtPuzzle,
  type Stage,
} from '../lib/shirtGame'
import Page from '../shared/layout/Page'

const STAGE_LABELS: Record<Stage, string> = { team: 'Team', season: 'Season', player: 'Player' }
/** The headline for a finished day, by how many stages you got right. */
const REACTIONS = ["You're getting sacked in the morning", 'Relegation form', 'Solid mid-table finish', 'Hattrick']
const STAGE_PROMPTS: Record<Stage, string> = {
  team: 'Which team is this shirt from?',
  season: 'Which season?',
  player: 'Who wore the number?',
}

/** What a finished day looks like, whether it was just played or restored from the account. */
interface Outcome {
  /** Whether each of team, season and player was guessed. */
  stages: boolean[]
  livesLeft: number
}

// ── Saved progress (one game per day, so a refresh can't hand out fresh lives) ──────────────────

interface Progress {
  /** Index into STAGES of the stage being guessed; STAGES.length once all three are done. */
  stage: number
  lives: number
  /** The answers given back so far, as each stage was got right. */
  answers: Partial<Record<Stage, string>>
  /** The squad for the right team and season, once the season is known. */
  squad: string[] | null
  /** Wrong guesses made so far in each stage. */
  wrong: Partial<Record<Stage, string[]>>
}

const STORAGE_PREFIX = 'shirt-game:'
const FRESH: Progress = { stage: 0, lives: MAX_LIVES, answers: {}, squad: null, wrong: {} }

function loadProgress(day: string): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + day) ?? 'null') as Partial<Progress> | null
    if (saved && typeof saved.stage === 'number' && typeof saved.lives === 'number') {
      return { ...FRESH, ...saved }
    }
  } catch {
    // unreadable: start fresh
  }
  return FRESH
}

function saveProgress(day: string, progress: Progress) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const stored = localStorage.key(i)
      if (stored?.startsWith(STORAGE_PREFIX) && stored !== STORAGE_PREFIX + day) localStorage.removeItem(stored)
    }
    localStorage.setItem(STORAGE_PREFIX + day, JSON.stringify(progress))
  } catch {
    // storage unavailable: the game still works, it just won't survive a refresh
  }
}

const normal = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// ── Pieces ───────────────────────────────────────────────────────────────────────────────────────

const KIT_LABELS = { home: 'Home', away: 'Away', third: 'Third' }

/** The squad number, then each of the club's kits that season, laid out on a pitch. */
function Clues({ puzzle }: { puzzle: ShirtPuzzle }) {
  return (
    <section
      className="flex flex-col items-center gap-4 rounded-[24px] px-3 py-5 shadow-(--card-shadow)"
      style={{ backgroundImage: 'repeating-linear-gradient(90deg, #3f9e68 0 44px, #37935f 44px 88px)' }}
    >
      <div className="flex items-center gap-3 rounded-full bg-white py-2 pr-6 pl-5 text-[#1b1220] shadow-[0_3px_0_rgb(0_0_0/0.2)]">
        <span className="text-[11px] leading-tight font-extrabold tracking-wide text-[#6b6475] uppercase">
          Squad
          <br />
          number
        </span>
        <span className="text-5xl leading-none font-black">{puzzle.number}</span>
      </div>
      <ul className="flex w-full justify-center gap-2" aria-label="The team's kits that season">
        {puzzle.kits.map((kit) => (
          <li key={kit.type} className="flex w-[31%] flex-col items-center gap-2">
            <div className="w-full overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_3px_0_rgb(0_0_0/0.2)]">
              <Shirt kit={kit} />
            </div>
            <span className="text-[12px] font-extrabold tracking-wide text-white/90 uppercase">
              {KIT_LABELS[kit.type]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Tap an option to guess it. Long lists get a search box. */
function OptionList({
  options,
  wrong,
  disabled,
  onPick,
}: {
  options: string[]
  wrong: string[]
  disabled: boolean
  onPick: (value: string) => void
}) {
  const [text, setText] = useState('')
  const matches = options.filter((option) => normal(option).includes(normal(text.trim())))
  const searchable = options.length > 8
  return (
    <div className="flex flex-col gap-2">
      {searchable && (
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches.length === 1 && !wrong.includes(matches[0])) onPick(matches[0])
          }}
          placeholder="Type to search…"
          autoComplete="off"
          autoCorrect="off"
          className="h-12 rounded-full bg-(--chip) px-5 text-base font-semibold text-(--ink) outline-none placeholder:text-(--soft)"
          aria-label="Search"
        />
      )}
      <ul
        className={`grid grid-cols-2 gap-2 ${searchable ? 'max-h-72 overflow-y-auto pr-1' : ''}`}
        aria-label="Choices"
      >
        {matches.map((option) => {
          const missed = wrong.includes(option)
          return (
            <li key={option} className="contents">
              <button
                type="button"
                disabled={disabled || missed}
                onClick={() => onPick(option)}
                className={`flex min-h-12 items-center justify-center rounded-[16px] px-2.5 py-2 text-center text-[15px] leading-tight font-extrabold transition active:scale-[0.97] ${
                  missed ? 'bg-red-500/15 text-red-500 line-through' : 'bg-(--chip) text-(--ink)'
                }`}
              >
                {option}
              </button>
            </li>
          )
        })}
        {matches.length === 0 && (
          <li className="col-span-2 p-3 text-center text-sm font-semibold text-(--soft)">No match</li>
        )}
      </ul>
    </div>
  )
}

/** The answers so far as chips that fill in as each stage is got right. */
function StageChips({ answers, current }: { answers: Partial<Record<Stage, string>>; current: number }) {
  return (
    <ol className="flex flex-wrap justify-center gap-2" aria-label="Your answers so far">
      {STAGES.map((stage, i) => {
        const answer = answers[stage]
        return (
          <li
            key={stage}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${
              answer
                ? 'bg-[#4CB87B] text-[#0E2A1B]'
                : i === current
                  ? 'bg-(--ink) text-(--bg)'
                  : 'bg-(--chip) text-(--soft)'
            }`}
          >
            {answer ?? STAGE_LABELS[stage]}
          </li>
        )
      })}
    </ol>
  )
}

// ── Finished ─────────────────────────────────────────────────────────────────────────────────────

function Finished({
  puzzle,
  day,
  outcome,
  record,
}: {
  puzzle: ShirtPuzzle
  day: string
  outcome: Outcome
  /** True when this was just played and still has to be saved; false when restored from the account. */
  record: boolean
}) {
  const score = outcome.stages.filter(Boolean).length
  const won = score === STAGES.length
  const [saved, setSaved] = useState(!record)
  const [answer, setAnswer] = useState<ShirtAnswer | null>(null)
  const [rivals, setRivals] = useState<RivalToday[]>([])
  const [copied, setCopied] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const started = useRef(false)

  // Save the result (the first one for a day is final), then everything that's only shown once it's saved.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const save = record
      ? submitResult(GAME_KEY, {
          puzzle_date: day,
          score,
          outcome: won ? 'won' : 'lost',
          details: { lives_left: outcome.livesLeft, stages: outcome.stages },
        })
      : Promise.resolve(null)
    save
      .then(() => {
        setSaved(true)
        return Promise.all([getShirtAnswer(day), listRivalsForDay(GAME_KEY, day)])
      })
      .then(([shown, rivalsToday]) => {
        setAnswer(shown)
        setRivals(rivalsToday)
      })
      .catch(() => setProblem("Couldn't save your result. Refresh to try again."))
  }, [record, day, score, won, outcome])

  async function share() {
    const text = shareText({
      day,
      stages: outcome.stages,
      livesLeft: outcome.livesLeft,
      url: `${window.location.origin}${import.meta.env.BASE_URL}#/shirt-game`,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your result:', text)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Clues puzzle={puzzle} />
      <section className="relative flex flex-col items-center gap-3 rounded-[24px] bg-(--card) p-5 text-center shadow-(--card-shadow)">
        {won && record && (
          <>
            <TickFlash />
            <div className="pointer-events-none fixed inset-0 z-50">
              <ScoreBurst kind="confetti" big />
            </div>
          </>
        )}
        <h2 className="text-2xl font-extrabold">{REACTIONS[score]}</h2>
        <DailyScore score={score} max={STAGES.length} icon="⚽" label="stages" className="gap-1 text-4xl" />
        <Lives lives={outcome.livesLeft} max={MAX_LIVES} icon="🧤" />
        {answer ? (
          <p className="text-[16px] font-semibold">
            It was <strong>{answer.player}</strong> (#{puzzle.number}) at {answer.team} in {answer.season}.
          </p>
        ) : (
          <p className="text-sm font-semibold text-(--soft)">{problem ?? 'Checking the answer…'}</p>
        )}
        <button
          type="button"
          onClick={share}
          className="h-[54px] w-full rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
        >
          {copied ? 'Copied to clipboard!' : 'Share result'}
        </button>
        <Link
          to={`/games/${GAME_KEY}/history`}
          className="flex h-[48px] w-full items-center justify-center rounded-full bg-(--chip) text-[16px] font-extrabold text-(--ink) transition active:scale-[0.97]"
        >
          Score history
        </Link>
        <p className="text-xs font-semibold text-(--soft)">A new shirt arrives tomorrow.</p>
      </section>
      <RivalsToday rivals={rivals} game={DAILY_GAMES[GAME_KEY]} />
      {saved && rivals.length === 0 && (
        <Link to="/game-scores" className="text-center text-[14px] font-bold text-(--soft) underline">
          Challenge a friend to a daily rivalry
        </Link>
      )}
    </div>
  )
}

// ── Playing ──────────────────────────────────────────────────────────────────────────────────────

function Round({ puzzle, day }: { puzzle: ShirtPuzzle; day: string }) {
  const [progress, setProgress] = useState(() => loadProgress(day))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [miss, setMiss] = useState(0)
  // Set when this visit's last life goes, so the red crosses burst once and not again on a refresh.
  const [outOfLives, setOutOfLives] = useState(false)

  useEffect(() => saveProgress(day, progress), [day, progress])

  const stage = STAGES[progress.stage]
  const done = progress.lives === 0 || progress.stage >= STAGES.length
  const outcome = useMemo<Outcome>(
    () => ({ stages: STAGES.map((s) => progress.answers[s] !== undefined), livesLeft: progress.lives }),
    [progress.answers, progress.lives],
  )

  async function pick(value: string) {
    if (busy || done) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await guess(day, stage, value)
      if (result.correct) {
        setProgress((p) => ({
          ...p,
          stage: p.stage + 1,
          answers: { ...p.answers, [stage]: result.answer ?? value },
          squad: result.squad ?? p.squad,
        }))
      } else {
        setProgress((p) => ({
          ...p,
          lives: p.lives - 1,
          wrong: { ...p.wrong, [stage]: [...(p.wrong[stage] ?? []), value] },
        }))
        setMessage(`Saved! It's not ${value}.`)
        setMiss((n) => n + 1)
        if (progress.lives === 1) setOutOfLives(true)
      }
    } catch {
      setMessage("Couldn't check that guess. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <>
        {outOfLives && (
          <>
            <MissFlash key={miss} />
            <div className="pointer-events-none fixed inset-0 z-50">
              <ScoreBurst kind="miss" big />
            </div>
          </>
        )}
        <Finished puzzle={puzzle} day={day} outcome={outcome} record />
      </>
    )
  }

  const options = stage === 'team' ? puzzle.teams : stage === 'season' ? puzzle.season_options : (progress.squad ?? [])
  return (
    <div className="flex flex-col gap-3">
      {miss > 0 && <MissFlash key={miss} />}
      <div className="flex items-center justify-between">
        <Lives lives={progress.lives} max={MAX_LIVES} icon="🧤" />
        <span className="text-sm font-bold text-(--soft)">
          {progress.stage + 1} of {STAGES.length}
        </span>
      </div>
      <Clues puzzle={puzzle} />
      <StageChips answers={progress.answers} current={progress.stage} />
      <section className="flex flex-col gap-3 rounded-[24px] bg-(--card) p-4 shadow-(--card-shadow)">
        <h2 className="text-center text-[17px] font-extrabold">{STAGE_PROMPTS[stage]}</h2>
        <p className={`text-center text-sm font-bold text-red-500 ${message ? '' : 'sr-only'}`} aria-live="polite">
          {message}
        </p>
        <OptionList key={stage} options={options} wrong={progress.wrong[stage] ?? []} disabled={busy} onPick={pick} />
      </section>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────────────────────

/** Dev builds only: forget your saved progress and recorded result for the day, to play it again. */
function DevReset({ day }: { day: string }) {
  if (!import.meta.env.DEV) return null
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          localStorage.removeItem(STORAGE_PREFIX + day)
        } catch {
          // nothing saved to clear
        }
        await deleteResultDev(GAME_KEY, day).catch(() => {})
        window.location.reload()
      }}
      className="mt-6 self-center text-xs font-bold text-(--soft) underline"
    >
      Reset today (dev only)
    </button>
  )
}

export default function ShirtGamePage() {
  const [params] = useSearchParams()
  // Dev builds can preview any day's shirt with ?date=YYYY-MM-DD.
  const day = (import.meta.env.DEV && params.get('date')) || localDateKey()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; puzzle: ShirtPuzzle; result: DailyGameResult | null }
  >({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getShirtPuzzle(day), getResult(GAME_KEY, day)])
      .then(([puzzle, result]) => !cancelled && setState({ status: 'ready', puzzle, result }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [day, attempt])

  // A result already on the account is final: show it rather than letting the day be replayed.
  const restored = useMemo<Outcome | null>(() => {
    if (state.status !== 'ready' || !state.result) return null
    const { details } = state.result
    const stages = Array.isArray(details.stages) ? details.stages.map((s) => s === true) : []
    return {
      stages: STAGES.map((_, i) => stages[i] ?? false),
      livesLeft: typeof details.lives_left === 'number' ? details.lives_left : 0,
    }
  }, [state])

  return (
    <Page
      title="Name the Shirt"
      subtitle="Guess the team, the season, then the player. Three lives."
      subtitleClassName="text-sm"
    >
      {state.status === 'loading' && <p className="text-center text-(--soft)">Finding today's shirt…</p>}
      {state.status === 'error' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-(--soft)">Couldn't load today's shirt.</p>
          <button
            type="button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
            className="h-12 rounded-full bg-(--ink) px-6 text-[16px] font-extrabold text-(--bg) transition active:scale-[0.97]"
          >
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' &&
        (restored ? (
          <Finished key={day} puzzle={state.puzzle} day={day} outcome={restored} record={false} />
        ) : (
          <Round key={day} puzzle={state.puzzle} day={day} />
        ))}
      <div className="flex flex-col">
        <DevReset day={day} />
      </div>
    </Page>
  )
}
