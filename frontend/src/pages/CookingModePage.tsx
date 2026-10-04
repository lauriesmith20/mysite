import { Bell, Minus, Monitor, Moon, Plus, Sun, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecipe, type Recipe } from '../lib/recipes'
import { useTheme } from '../lib/theme'

const ACCENT = '#F09A52'

function formatClock(secs: number) {
  const hh = Math.floor(secs / 3600)
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`
}

interface StepTimer {
  remaining: number
  endAt: number | null
  done: boolean
}

let audioCtx: AudioContext | null = null

// Created from a click so browsers allow it to keep playing when the tab is in the background.
function unlockAudio() {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    // no audio support; vibration/notification still fire
  }
}

function beep() {
  if (!audioCtx) return
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const t = audioCtx.currentTime + i * 0.25
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + 0.2)
  }
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
  const [timers, setTimers] = useState<Record<number, StepTimer>>({})
  const [ringing, setRinging] = useState<number[]>([])
  const timersRef = useRef(timers)

  useEffect(() => {
    if (id) getRecipe(Number(id)).then(setRecipe)
  }, [id])

  const totalFor = (i: number) => recipe?.step_details?.[i]?.timer_seconds ?? 0
  const timerFor = (i: number): StepTimer => timers[i] ?? { remaining: totalFor(i), endAt: null, done: false }
  const anyRunning = Object.values(timers).some((t) => t.endAt !== null)

  // One ticker drives every running timer, so they keep counting while you browse other steps.
  useEffect(() => {
    if (!anyRunning) return
    const tick = setInterval(() => {
      const finished: number[] = []
      const next = { ...timersRef.current }
      for (const [key, t] of Object.entries(timersRef.current)) {
        if (t.endAt === null) continue
        const left = Math.max(0, Math.round((t.endAt - Date.now()) / 1000))
        if (left === 0) {
          finished.push(Number(key))
          next[Number(key)] = { remaining: 0, endAt: null, done: true }
        } else if (left !== t.remaining) {
          next[Number(key)] = { ...t, remaining: left }
        }
      }
      timersRef.current = next
      setTimers(next)
      if (finished.length) {
        setRinging((r) => [...new Set([...r, ...finished])])
        navigator.vibrate?.([300, 150, 300])
        if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Timer done', { body: `Step ${finished[0] + 1} of ${recipe?.title ?? 'your recipe'}` })
        }
      }
    }, 250)
    return () => clearInterval(tick)
  }, [anyRunning, recipe?.title])

  // Keep beeping until the alert is dismissed.
  useEffect(() => {
    if (ringing.length === 0) return
    beep()
    const again = setInterval(beep, 2000)
    return () => clearInterval(again)
  }, [ringing.length])

  function updateTimers(change: Record<number, StepTimer>) {
    timersRef.current = { ...timersRef.current, ...change }
    setTimers(timersRef.current)
  }

  function startStop() {
    unlockAudio()
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    const t = timerFor(step)
    if (t.remaining <= 0) return
    updateTimers({
      [step]:
        t.endAt === null
          ? { remaining: t.remaining, endAt: Date.now() + t.remaining * 1000, done: false }
          : { remaining: t.remaining, endAt: null, done: false },
    })
  }

  // Nudge the current step's timer; works while running (moves the end time) or paused.
  function adjustTimer(direction: 1 | -1) {
    const t = timerFor(step)
    const delta = (t.remaining >= 1800 ? 300 : 60) * direction
    const remaining = Math.max(30, t.remaining + delta)
    const running = t.endAt !== null
    updateTimers({
      [step]: { remaining, endAt: running ? Date.now() + remaining * 1000 : null, done: false },
    })
    setRinging((r) => r.filter((i) => i !== step))
  }

  function resetTimer() {
    updateTimers({ [step]: { remaining: totalFor(step), endAt: null, done: false } })
    setRinging((r) => r.filter((i) => i !== step))
  }

  const goTo = (n: number) => {
    if (recipe) setStep(Math.max(0, Math.min(recipe.steps.length - 1, n)))
  }

  if (!recipe) {
    return <main className="px-5 pb-10 pt-1 md:pt-6 text-center text-(--soft)">Loading…</main>
  }

  const last = step === recipe.steps.length - 1
  const detail = recipe.step_details?.[step]
  const timerTotal = totalFor(step)
  const current = timerFor(step)
  const secs = current.remaining
  const running = current.endAt !== null
  const caption = current.done ? 'Time is up' : running ? 'Timer running' : 'Timer ready'
  const others = Object.entries(timers)
    .map(([k, t]) => ({ i: Number(k), t }))
    .filter(({ i, t }) => i !== step && t.endAt !== null)

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

      {ringing.length > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[22px] px-4 py-3 text-[#2A1606]"
          style={{ backgroundColor: ACCENT }}
        >
          <span className="flex items-center gap-2 text-[15px] font-extrabold">
            <Bell size={20} aria-hidden="true" />
            Step {ringing.map((i) => i + 1).join(', ')} timer done
          </span>
          <button
            type="button"
            onClick={() => setRinging([])}
            className="h-10 rounded-full bg-[#2A1606] px-4 text-sm font-extrabold text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {others.map(({ i, t }) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-(--chip) px-3.5 text-[13px] font-bold tabular-nums text-(--ink)"
            >
              Step {i + 1} · {formatClock(t.remaining)}
            </button>
          ))}
        </div>
      )}

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
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => adjustTimer(-1)}
              aria-label="Subtract time"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition active:scale-[0.92]"
            >
              <Minus size={22} aria-hidden="true" />
            </button>
            <span
              className={`${secs >= 3600 ? 'text-5xl' : 'text-[64px]'} font-extrabold leading-none tracking-tight tabular-nums`}
            >
              {formatClock(secs)}
            </span>
            <button
              type="button"
              onClick={() => adjustTimer(1)}
              aria-label="Add time"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition active:scale-[0.92]"
            >
              <Plus size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="flex w-full gap-2.5">
            <button
              type="button"
              onClick={resetTimer}
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
