import type { World } from './countryGraph'
import { normalise, type Adjacency, type Candidate } from './countryHopperGame'
import { COUNTRY_META } from './countryMeta'

export interface HopperWorld {
  /**
   * Land borders as the game sees them: only countries with a flag/ISO code are playable. French
   * Guiana is part of France in the map data, so France borders Brazil and Suriname on purpose.
   */
  adjacency: Adjacency
  /** Display name per country id. */
  labels: string[]
  /** Lower-case ISO alpha-2 per country id ('' if there isn't one), for the flag image. */
  codes: string[]
  /** Everything the player can type, including island nations (guessing one costs a life). */
  candidates: Candidate[]
}

export function buildHopperWorld(world: World): HopperWorld {
  const names = world.countries.map((c) => c.name)
  const playable = names.map((name) => name in COUNTRY_META)

  const adjacency = world.adjacency.map((neighbours, i) => (playable[i] ? neighbours.filter((j) => playable[j]) : []))
  const labels = names.map((name) => COUNTRY_META[name]?.label ?? name)
  const codes = names.map((name) => COUNTRY_META[name]?.code ?? '')
  const candidates = world.countries.flatMap((country) => {
    const meta = COUNTRY_META[country.name]
    if (!meta) return []
    const terms = [labels[country.id], country.name, ...(meta.aliases ?? [])].map(normalise)
    return [{ id: country.id, label: labels[country.id], terms: [...new Set(terms)] }]
  })
  return { adjacency, labels, codes, candidates }
}
