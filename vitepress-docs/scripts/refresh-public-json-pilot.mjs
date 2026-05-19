import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const DEFAULT_SOURCE_URL = 'https://jsonplaceholder.typicode.com/posts'
export const DEFAULT_LIMIT = 10
export const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../docs/public/data/public-json-pilot.json')

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function parseArgs(argv) {
  const options = {
    source: DEFAULT_SOURCE_URL,
    output: DEFAULT_OUTPUT_PATH,
    limit: DEFAULT_LIMIT
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--source' && next) {
      options.source = next
      index += 1
      continue
    }

    if (current === '--output' && next) {
      options.output = path.resolve(next)
      index += 1
      continue
    }

    if (current === '--limit' && next) {
      const parsedLimit = Number.parseInt(next, 10)

      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        throw new Error(`Invalid --limit value: ${next}`)
      }

      options.limit = parsedLimit
      index += 1
    }
  }

  return options
}

function normalizePostRecord(record, index) {
  if (!isPlainObject(record)) {
    throw new Error(`Post at index ${index} is not an object`)
  }

  const { id, userId, title, body } = record

  if (!Number.isInteger(id)) {
    throw new Error(`Post at index ${index} is missing an integer id`)
  }

  if (!Number.isInteger(userId)) {
    throw new Error(`Post at index ${index} is missing an integer userId`)
  }

  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error(`Post at index ${index} is missing a non-empty title`)
  }

  if (typeof body !== 'string' || body.trim() === '') {
    throw new Error(`Post at index ${index} is missing a non-empty body`)
  }

  return {
    id,
    userId,
    title,
    body
  }
}

export function normalizePosts(payload, limit = DEFAULT_LIMIT) {
  if (!Array.isArray(payload)) {
    throw new Error('Expected source payload to be an array of posts')
  }

  return payload
    .slice(0, limit)
    .map((record, index) => normalizePostRecord(record, index))
}

export function createSnapshot(payload, options = {}) {
  const source = options.source ?? DEFAULT_SOURCE_URL
  const limit = options.limit ?? DEFAULT_LIMIT
  const fetchedAt = options.fetchedAt ?? new Date().toISOString()
  const items = normalizePosts(payload, limit)

  return {
    source,
    fetchedAt,
    itemCount: items.length,
    items
  }
}

export async function fetchPosts(source = DEFAULT_SOURCE_URL, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch API is not available in the current runtime')
  }

  const response = await fetchImpl(source, {
    headers: {
      accept: 'application/json'
    }
  })

  if (!response || !response.ok) {
    const status = response?.status ?? 'unknown'
    const statusText = response?.statusText ?? 'unknown'
    throw new Error(`Failed to fetch public JSON pilot: ${status} ${statusText}`)
  }

  return response.json()
}

export function writeSnapshot(snapshot, outputPath = DEFAULT_OUTPUT_PATH) {
  const targetPath = path.resolve(outputPath)
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  return targetPath
}

export async function refreshPublicJsonPilot(options = {}) {
  const source = options.source ?? DEFAULT_SOURCE_URL
  const payload = options.payload ?? await fetchPosts(source, options.fetchImpl)
  const snapshot = createSnapshot(payload, {
    source,
    limit: options.limit,
    fetchedAt: options.fetchedAt
  })
  const outputPath = writeSnapshot(snapshot, options.output ?? DEFAULT_OUTPUT_PATH)

  return {
    outputPath,
    snapshot
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const result = await refreshPublicJsonPilot(options)

  process.stdout.write(`${JSON.stringify({
    outputPath: result.outputPath,
    itemCount: result.snapshot.itemCount,
    fetchedAt: result.snapshot.fetchedAt,
    source: result.snapshot.source
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
}