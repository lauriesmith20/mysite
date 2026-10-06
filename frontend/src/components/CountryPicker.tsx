import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { suggest, type Candidate } from '../lib/countryHopperGame'
import CountryFlag from './CountryFlag'

interface CountryPickerProps {
  candidates: Candidate[]
  /** Flag code for a country id. */
  codeOf: (id: number) => string
  /** Countries already on the route: still listed, but marked. */
  visited: Set<number>
  onSubmit: (id: number) => void
  /** Enter was pressed with text that matches no country. */
  onNoMatch: (text: string) => void
  /** Change this number to shake the bar (a bad entry). */
  shake: number
  disabled?: boolean
}

/** Type-ahead country field: suggestions open above the field (clear of the phone keyboard). */
export default function CountryPicker({ candidates, codeOf, visited, onSubmit, onNoMatch, shake, disabled }: CountryPickerProps) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = suggest(candidates, text)

  useEffect(() => {
    if (!shake || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    barRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 350 },
    )
  }, [shake])

  function choose(id: number) {
    setText('')
    setActive(0)
    onSubmit(id)
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Escape') {
      setText('')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches.length > 0) choose(matches[Math.min(active, matches.length - 1)].id)
      else if (text.trim()) onNoMatch(text.trim())
    }
  }

  return (
    <div ref={barRef} className="relative">
      {matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="Matching countries"
          className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-[18px] bg-(--card) shadow-(--card-shadow)"
        >
          {matches.map((candidate, i) => (
            <li key={candidate.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown + preventDefault keeps the field focused (and the phone keyboard open).
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(candidate.id)
                }}
                // Hover only styles the row. It must not move `active`: a pointer resting where the
                // list opens would otherwise change which country Enter submits.
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[16px] font-bold hover:bg-(--chip)/60 ${
                  i === active ? 'bg-(--chip)' : ''
                } ${visited.has(candidate.id) ? 'opacity-45' : ''}`}
              >
                <CountryFlag code={codeOf(candidate.id)} className="h-5 w-7" />
                <span className="min-w-0 flex-1 truncate">{candidate.label}</span>
                {visited.has(candidate.id) && <span className="text-xs font-semibold">on your route</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 rounded-full bg-(--card) py-1.5 pl-5 pr-1.5 shadow-(--card-shadow)">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          type="text"
          inputMode="text"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Type the next country…"
          aria-label="Next country"
          className="min-w-0 flex-1 bg-transparent py-2 text-[17px] font-bold text-(--ink) outline-none placeholder:font-semibold placeholder:text-(--soft)"
        />
        <button
          type="button"
          aria-label="Hop to this country"
          disabled={disabled || (matches.length === 0 && !text.trim())}
          onClick={() => {
            if (matches.length > 0) choose(matches[Math.min(active, matches.length - 1)].id)
            else if (text.trim()) onNoMatch(text.trim())
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--ink) text-(--bg) transition active:scale-[0.94] disabled:opacity-35"
        >
          <CornerDownLeft size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
