import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildForkedReposPayload,
  buildForksApiUrl,
  toForkedRepoEntry
} from '../scripts/refresh-forked-repos.mjs'

function makeRepo(overrides = {}) {
  return {
    name: 'example',
    description: '一个示例仓库',
    html_url: 'https://github.com/daodaocrazy/example',
    language: 'TypeScript',
    stargazers_count: 3,
    forks_count: 1,
    updated_at: '2026-11-01T00:00:00Z',
    fork: true,
    ...overrides
  }
}

test('buildForksApiUrl asks for owned repositories sorted by update time', () => {
  const url = new URL(buildForksApiUrl('daodaocrazy'))

  assert.equal(url.hostname, 'api.github.com')
  assert.equal(url.pathname, '/users/daodaocrazy/repos')
  assert.equal(url.searchParams.get('sort'), 'updated')
  assert.equal(url.searchParams.get('type'), 'owner')
})

test('buildForkedReposPayload keeps only forks and sorts them newest first', () => {
  const payload = buildForkedReposPayload([
    makeRepo({ name: 'older', updated_at: '2026-01-01T00:00:00Z' }),
    makeRepo({ name: 'not-a-fork', fork: false }),
    makeRepo({ name: 'newer', updated_at: '2026-11-17T00:00:00Z' })
  ], { username: 'daodaocrazy', generatedAt: '2026-11-19T00:00:00.000Z' })

  assert.deepEqual(payload.repos.map((repo) => repo.name), ['newer', 'older'])
  assert.equal(payload.totalForks, 2)
  assert.equal(payload.username, 'daodaocrazy')
  assert.equal(payload.generatedAt, '2026-11-19T00:00:00.000Z')
})

test('buildForkedReposPayload rejects a non-array response instead of shipping empty data', () => {
  assert.throws(
    () => buildForkedReposPayload({ message: 'API rate limit exceeded' }),
    /不是数组/
  )
})

test('toForkedRepoEntry normalizes the fields the homepage actually renders', () => {
  const entry = toForkedRepoEntry(makeRepo({
    name: 'cfapex',
    description: '  多行\n描述   带多余空白 ',
    language: null,
    stargazers_count: undefined,
    forks_count: undefined,
    updated_at: '2026-11-17T09:00:00Z'
  }))

  assert.equal(entry.name, 'cfapex')
  assert.equal(entry.description, '多行 描述 带多余空白', '应折叠空白')
  assert.equal(entry.language, null, '空语言应保持 null，交给组件决定是否隐藏')
  assert.equal(entry.stars, 0, '缺失的 star 应归一为 0')
  assert.equal(entry.forks, 0, '缺失的 fork 数应归一为 0')
  assert.equal(entry.updatedAt, '2026-11-17T09:00:00Z')
})

test('toForkedRepoEntry truncates very long descriptions', () => {
  const entry = toForkedRepoEntry(makeRepo({ description: 'x'.repeat(500) }))

  assert.ok(entry.description.length <= 220, '描述应被截断到 220 字以内')
  assert.ok(entry.description.endsWith('…'), '截断后应有省略号')
})

test('toForkedRepoEntry treats a blank description as absent', () => {
  assert.equal(toForkedRepoEntry(makeRepo({ description: '   ' })).description, null)
  assert.equal(toForkedRepoEntry(makeRepo({ description: null })).description, null)
})
