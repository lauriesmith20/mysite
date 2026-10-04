import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { feature, neighbors } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldUrl from 'world-atlas/countries-50m.json?url'

export const MAP_WIDTH = 960
export const MAP_HEIGHT = 500

export interface Country {
  id: number
  name: string
  /** Simplified outline, used at world/continent zoom (about 3x fewer points). */
  d: string
  /** Full-detail outline, swapped in when zoomed right in. */
  dFine: string
  center: [number, number]
}

export interface World {
  countries: Country[]
  /** `adjacency[i]` lists the indexes of countries sharing a land border with country `i`. */
  adjacency: number[][]
}

let worldPromise: Promise<World> | null = null

// Loaded on demand (the topology is ~750 KB) and cached for the session.
export function loadWorld(): Promise<World> {
  worldPromise ??= buildWorld().catch((error) => {
    worldPromise = null
    throw error
  })
  return worldPromise
}

async function buildWorld(): Promise<World> {
  const response = await fetch(worldUrl)
  if (!response.ok) throw new Error('Failed to load map data')
  const topology = (await response.json()) as Topology<{ countries: GeometryCollection<{ name: string }> }>
  const geometries = topology.objects.countries.geometries

  // Shared arcs between two geometries are exactly their land borders.
  const rawNeighbors = neighbors(geometries as unknown as Parameters<typeof neighbors>[0])

  const projection = geoNaturalEarth1().fitExtent(
    [
      [2, 2],
      [MAP_WIDTH - 2, MAP_HEIGHT - 2],
    ],
    { type: 'Sphere' },
  )
  const path = geoPath(projection).digits(1)

  // Rendering ~200k points on every pan/zoom frame is what makes the map sluggish, so the
  // zoomed-out view uses a Visvalingam-simplified copy (same arcs, so same shapes and borders).
  const pre = presimplify(topology)
  const coarse = simplify(pre, quantile(pre, 0.25))
  const coarseGeometries = (coarse.objects.countries as GeometryCollection<{ name: string }>).geometries

  const kept: number[] = []
  const countries: Country[] = []
  geometries.forEach((geometry, index) => {
    const name = (geometry.properties as { name?: string } | undefined)?.name
    if (!name || name === 'Antarctica') return
    const shape = feature(topology, geometry) as Feature<Polygon | MultiPolygon>
    const dFine = path(shape)
    if (!dFine) return
    const d = path(feature(coarse, coarseGeometries[index]) as Feature<Polygon | MultiPolygon>) ?? dFine
    kept.push(index)
    countries.push({ id: countries.length, name, d, dFine, center: labelPoint(shape, path) })
  })

  const newIndex = new Map(kept.map((oldIndex, i) => [oldIndex, i]))
  const adjacency = kept.map((oldIndex) =>
    rawNeighbors[oldIndex].flatMap((n) => {
      const mapped = newIndex.get(n)
      return mapped === undefined ? [] : [mapped]
    }),
  )
  return { countries, adjacency }
}

// Centroid of the biggest polygon, so overseas territories (e.g. French Guiana) don't drag a label into the ocean.
function labelPoint(shape: Feature<Polygon | MultiPolygon>, path: ReturnType<typeof geoPath>): [number, number] {
  let target: Feature<Polygon | MultiPolygon> = shape
  if (shape.geometry.type === 'MultiPolygon') {
    let best = -1
    for (const coordinates of shape.geometry.coordinates) {
      const polygon: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } }
      const area = geoArea(polygon)
      if (area > best) {
        best = area
        target = polygon
      }
    }
  }
  const [x, y] = path.centroid(target)
  return [x, y]
}

export interface RouteResult {
  /** Up to `limit` routes, each a list of country indexes from `from` to `to`. */
  routes: number[][]
  /** Total number of distinct shortest routes (may exceed `routes.length`). */
  totalRoutes: number
  /** Number of borders crossed on a shortest route. */
  borders: number
  /** Every country that sits on at least one shortest route (including both ends). */
  onAnyRoute: Set<number>
}

function bfs(adjacency: number[][], source: number): number[] {
  const dist = new Array<number>(adjacency.length).fill(-1)
  dist[source] = 0
  const queue = [source]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    for (const next of adjacency[current]) {
      if (dist[next] === -1) {
        dist[next] = dist[current] + 1
        queue.push(next)
      }
    }
  }
  return dist
}

/** All fewest-border routes between two countries, or null if there is no land route. */
export function shortestRoutes(adjacency: number[][], from: number, to: number, limit = 12): RouteResult | null {
  if (from === to) return null
  const fromDist = bfs(adjacency, from)
  const toDist = bfs(adjacency, to)
  const borders = fromDist[to]
  if (borders === -1) return null

  const onAnyRoute = new Set<number>()
  fromDist.forEach((d, i) => {
    if (d !== -1 && toDist[i] !== -1 && d + toDist[i] === borders) onAnyRoute.add(i)
  })

  // Count routes with DP over BFS layers, then enumerate up to `limit` of them.
  const count = new Map<number, number>()
  const countFrom = (node: number): number => {
    if (node === to) return 1
    const cached = count.get(node)
    if (cached !== undefined) return cached
    let total = 0
    for (const next of adjacency[node]) {
      if (onAnyRoute.has(next) && fromDist[next] === fromDist[node] + 1) total += countFrom(next)
    }
    count.set(node, total)
    return total
  }
  const totalRoutes = countFrom(from)

  const routes: number[][] = []
  const walk = (node: number, trail: number[]) => {
    if (routes.length >= limit) return
    const next = [...trail, node]
    if (node === to) {
      routes.push(next)
      return
    }
    for (const n of adjacency[node]) {
      if (onAnyRoute.has(n) && fromDist[n] === fromDist[node] + 1) walk(n, next)
    }
  }
  walk(from, [])

  return { routes, totalRoutes, borders, onAnyRoute }
}
