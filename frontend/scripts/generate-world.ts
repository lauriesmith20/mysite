/**
 * Generates the map data the Country Hopper and route explorer load (src/data/world*.json) from the
 * Natural Earth topology in world-atlas. The geometry work (simplifying shapes, building outlines,
 * finding borders) is slow, so it is done here once instead of in every visitor's browser.
 *
 * Re-run after changing the map code or upgrading world-atlas:  npm run gen:world
 * Country ids are the order of the output, and daily puzzles are picked by id, so a change in
 * the order changes the puzzles.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { feature, neighbors } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import type { GeometryCollection, Topology } from 'topojson-specification'

const MAP_WIDTH = 960
const MAP_HEIGHT = 500

const topology = JSON.parse(
  readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url), 'utf8'),
) as Topology<{ countries: GeometryCollection<{ name: string }> }>

function buildWorld() {
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
  const countries: { id: number; name: string; d: string; dFine: string; center: [number, number] }[] = []
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

const { countries, adjacency } = buildWorld()

const out = (name: string, data: unknown) =>
  writeFileSync(new URL(`../src/data/${name}`, import.meta.url), JSON.stringify(data) + '\n')

// The graph is small and is bundled with the game. The shapes are big, and are only fetched for the map.
out('worldGraph.json', { names: countries.map((c) => c.name), adjacency })
out('worldShapes.json', {
  d: countries.map((c) => c.d),
  dFine: countries.map((c) => c.dFine),
  center: countries.map((c) => c.center),
})
console.log(`Wrote ${countries.length} countries`)
