import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSnapshot,
  fetchPosts,
  normalizePosts,
  refreshPublicJsonPilot
} from '../scripts/refresh-public-json-pilot.mjs'

function createPostFixtures(count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    userId: index + 1,
    id: index + 101,
    title: `title ${index + 1}`,
    body: `body ${index + 1}`,
    ignored: `ignored ${index + 1}`
  }))
}

test('normalizePosts keeps only the expected fields and default limit', () => {
  const items = normalizePosts(createPostFixtures())

  assert.equal(items.length, 10)
  assert.deepEqual(items[0], {
    id: 101,
    userId: 1,
    title: 'title 1',
    body: 'body 1'
  })
  assert.equal('ignored' in items[0], false)
})

test('normalizePosts rejects malformed records', () => {
  assert.throws(
    () => normalizePosts([{ id: 1, userId: 2, title: 'missing body' }]),
    /missing a non-empty body/
  )
})

test('createSnapshot returns stable metadata and item count', () => {
  const snapshot = createSnapshot(createPostFixtures(), {
    source: 'https://example.com/posts',
    fetchedAt: '2026-05-19T00:00:00.000Z',
    limit: 2
  })

  assert.deepEqual(snapshot, {
    source: 'https://example.com/posts',
    fetchedAt: '2026-05-19T00:00:00.000Z',
    itemCount: 2,
    items: [
      {
        id: 101,
        userId: 1,
        title: 'title 1',
        body: 'body 1'
      },
      {
        id: 102,
        userId: 2,
        title: 'title 2',
        body: 'body 2'
      }
    ]
  })
})

test('fetchPosts fails fast on non-ok responses', async () => {
  await assert.rejects(
    () => fetchPosts('https://example.com/posts', async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    })),
    /503 Service Unavailable/
  )
})

test('refreshPublicJsonPilot writes the snapshot file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-json-pilot-'))
  const outputPath = path.join(tempDir, 'public-json-pilot.json')
  const fetchedAt = '2026-05-19T08:00:00.000Z'
  const { snapshot } = await refreshPublicJsonPilot({
    source: 'https://example.com/posts',
    output: outputPath,
    limit: 3,
    fetchedAt,
    fetchImpl: async () => ({
      ok: true,
      json: async () => createPostFixtures()
    })
  })

  assert.equal(fs.existsSync(outputPath), true)
  assert.deepEqual(JSON.parse(fs.readFileSync(outputPath, 'utf8')), snapshot)
  assert.equal(snapshot.itemCount, 3)
  assert.equal(snapshot.fetchedAt, fetchedAt)
})