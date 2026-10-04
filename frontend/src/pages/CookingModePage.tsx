import { Monitor, Moon, Sun, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecipe, type Recipe } from '../lib/recipes'
import { useTheme } from '../lib/theme'

const ACCENT = '#F09A52'

function formatClock(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

// Keeps the screen awake while cooking; silently does nothing where unsupported.
function useWakeLock() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
        if (cancelled) await lock?.release()
        else setActive(Boolean(lock))
        lock?.addEventListener('release', () => setActive(false))
      } catch {
        setActive(false)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])

  return active
}

export default function CookingModePage() {
  const { id } = useParams<{ id: string }>()
  const { dark, toggle } = useTheme()
  const awake = useWakeLock()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [step, setStep] = useState(0)
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  const endAt = useRef(0)

  useEffect(() => {
    if (id)
      getRecipe(Number(id)).then((r) => {
        setRecipe(r)
        setSecs(r.step_details?.[0]?.timer_seconds ?? 0)
      })
  }, [id])

  const detail = recipe?.step_details?.[step]
  const timerTotal = detail?.timer_seconds ?? 0

  const goTo = useCallback(
    (n: number) => {
      if (!recipe) return
      const next = Math.max(0, Math.min(recipe.steps.length - 1, n))
      setStep(next)
      setSecs(recipe.step_details?.[next]?.timer_seconds ?? 0)
      setRunning(false)
    },
    [recipe],
  )

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setSecs(left)
      if (left === 0) {
        setRunning(false)
        navigator.vibrate?.([300, 150, 300])
      }
    }, 250)
    return () => clearInterval(tick)
  }, [running])

  function startStop() {
    if (secs <= 0) return
    if (!running) endAt.current = Date.now() + secs * 1000
    setRunning((r) => !r)
  }

  if (!recipe) {
    return <main className="px-5 py-12 text-center text-(--soft)">Loading…</main>
  }

  const last = step === recipe.steps.length - 1
  const caption = secs === 0 ? 'Time is up' : running ? 'Timer running' : 'Timer ready'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-5 pb-6">
      <div className="flex items-center justify-between pt-4">
        <Link
          to={`/recipes/${recipe.id}`}
          aria-label="Exit cooking mode"
          className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-(--ink)"
        >
          <X size={26} aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2">
          {awake && (
            <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-(--chip) px-3 text-xs font-bold text-(--soft)">
              <Monitor size={14} aria-hidden="true" />
              Screen stays on
            </span>
          )}
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip) text-(--ink)"
          >
            {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-extrabold">{recipe.title}</span>
          <span className="shrink-0 text-[13px] font-bold text-(--soft)">
            Step {step + 1} of {recipe.steps.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {recipe.steps.map((_, i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded"
              style={{ backgroundColor: i <= step ? ACCENT : 'var(--chip)' }}
            />
          ))}
        </div>
      </div>

      <div className="flex grow flex-col gap-4">
        <p className="text-[34px] font-extrabold leading-[1.12] tracking-tight">{recipe.steps[step]}</p>
        {detail && detail.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detail.ingredients.map((name) => (
              <span
                key={name}
                className="rounded-[18px] px-3.5 py-2 text-sm font-bold text-[#2A1606]"
                style={{ backgroundColor: ACCENT }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {timerTotal > 0 && (
        <div className="flex flex-col items-center gap-3.5 rounded-[28px] bg-(--card) p-5 shadow-(--card-shadow)">
          <span className="text-xs font-bold text-(--soft)" aria-live="polite">
            {caption}
          </span>
          <span className="text-[72px] font-extrabold leading-none tracking-tight tabular-nums">
            {formatClock(secs)}
          </span>
          <div className="flex w-full gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSecs(timerTotal)
                setRunning(false)
              }}
              className="h-[52px] flex-1 rounded-full bg-(--chip) text-base font-extrabold text-(--ink) transition active:scale-[0.97]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={startStop}
              disabled={secs === 0}
              className="h-[52px] flex-[2] rounded-full text-base font-extrabold text-[#2A1606] transition active:scale-[0.97] disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {running ? 'Pause' : secs === 0 ? 'Done' : 'Start timer'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="h-[58px] flex-1 rounded-full bg-(--chip) text-[17px] font-extrabold text-(--ink) transition active:scale-[0.97] disabled:opacity-45"
        >
          Back
        </button>
        {last ? (
          <Link
            to={`/recipes/${recipe.id}`}
            className="flex h-[58px] flex-[2] items-center justify-center rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg)"
          >
            Finish
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            className="h-[58px] flex-[2] rounded-full bg-(--ink) text-[17px] font-extrabold text-(--bg) transition active:scale-[0.97]"
          >
            Next step
          </button>
        )}
      </div>
    </main>
  )
}
