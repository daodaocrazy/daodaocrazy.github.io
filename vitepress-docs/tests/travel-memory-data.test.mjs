import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  deriveTravelIndexEntries,
  loadTravelTripsFromDir,
  syncTravelMemoryArtifacts
} from '../scripts/travel-memory-data.mjs'

const fixtureTripsDir = new URL('../docs/.data/travel/trips/', import.meta.url)

test('loadTravelTripsFromDir loads and validates trip fixtures', () => {
  const trips = loadTravelTripsFromDir(fixtureTripsDir)

  assert.equal(trips.length, 1)
  assert.equal(trips[0].trip.slug, 'kyoto-2026-spring')
  assert.equal(trips[0].days.length, trips[0].trip.daysCount)
  assert.equal(trips[0].segments[0].routeGeometry.type, 'LineString')
})

test('deriveTravelIndexEntries returns summary fields sorted by published date desc', () => {
  const trips = loadTravelTripsFromDir(fixtureTripsDir)
  const entries = deriveTravelIndexEntries(trips)

  assert.equal(entries.length, 1)
  assert.deepEqual(entries[0], {
    slug: 'kyoto-2026-spring',
    title: '关西樱花 2 日',
    startDate: '2026-04-05',
    endDate: '2026-04-06',
    daysCount: 2,
    region: '日本',
    places: ['京都', '宇治', '大阪'],
    tags: ['城市漫游', '电车', '樱花季'],
    coverImage: '/travel/kyoto-2026-spring/cover.jpg',
    summary: '从京都东山步行到宇治，再转到大阪入住的两日春季路线。',
    publishedAt: '2026-04-20',
    routePreview: {
      bbox: [135.5, 34.67, 135.82, 34.99],
      center: [135.67, 34.84],
      line: {
        type: 'LineString',
        coordinates: [
          [135.7587, 34.9855],
          [135.785, 34.9949],
          [135.8077, 34.8895],
          [135.4959, 34.7025]
        ]
      }
    }
  })
})

test('syncTravelMemoryArtifacts writes derived index and markdown shell pages', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-memory-'))

  try {
    const result = syncTravelMemoryArtifacts({
      tripsDir: fixtureTripsDir,
      derivedIndexPath: path.join(tempRoot, 'derived', 'travel-index.json'),
      generatedPagesDir: path.join(tempRoot, 'generated')
    })

    assert.equal(result.trips.length, 1)
    assert.equal(result.generatedPages.length, 1)

    const generatedPagePath = path.join(tempRoot, 'generated', 'kyoto-2026-spring.md')
    const generatedPage = fs.readFileSync(generatedPagePath, 'utf8')

    assert.match(generatedPage, /^---\n/)
    assert.match(generatedPage, /title: 关西樱花 2 日/)
    assert.match(generatedPage, /travelSlug: kyoto-2026-spring/)
    assert.match(generatedPage, /pageClass: travel-memory-trip-page/)
    assert.doesNotMatch(generatedPage, /travel-memory-atlas 页面工作台渲染/)

    const derivedIndex = JSON.parse(fs.readFileSync(path.join(tempRoot, 'derived', 'travel-index.json'), 'utf8'))
    assert.equal(derivedIndex.length, 1)
    assert.equal(derivedIndex[0].slug, 'kyoto-2026-spring')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})