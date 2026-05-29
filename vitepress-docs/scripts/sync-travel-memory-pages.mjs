import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { syncTravelMemoryArtifacts } from './travel-memory-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const result = syncTravelMemoryArtifacts({
  tripsDir: path.resolve(__dirname, '../docs/.data/travel/trips'),
  derivedIndexPath: path.resolve(__dirname, '../docs/.data/travel/derived/travel-index.json'),
  generatedPagesDir: path.resolve(__dirname, '../docs/travel/_generated')
})

process.stdout.write(`Synced ${result.trips.length} travel trip(s) and ${result.generatedPages.length} generated page(s).\n`)