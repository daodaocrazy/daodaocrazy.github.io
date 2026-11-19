import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 放在 .data 下由组件在构建期直接 import，首屏不再发请求，也不会闪一下空白。
export const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../docs/.data/forked-repos.json')
export const DEFAULT_USERNAME = 'daodaocrazy'

export function buildForksApiUrl(username) {
  return `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.replace(/\s+/g, ' ').trim()

  if (trimmed === '') {
    return null
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed
}

// 首页只需要几个字段，其余（语言为 null、star 为 0、topics 为空）在
// 这些 fork 上几乎是常态，留在快照里只会让组件去渲染空值。
export function toForkedRepoEntry(repo) {
  return {
    name: repo.name,
    description: normalizeText(repo.description, 220),
    url: repo.html_url,
    language: normalizeText(repo.language, 40),
    stars: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0,
    forks: Number.isFinite(repo.forks_count) ? repo.forks_count : 0,
    updatedAt: typeof repo.updated_at === 'string' ? repo.updated_at : null
  }
}

export function buildForkedReposPayload(repos, options = {}) {
  const username = options.username ?? DEFAULT_USERNAME
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  if (!Array.isArray(repos)) {
    throw new Error('GitHub 返回的不是数组，可能是限流或错误响应')
  }

  const entries = repos
    .filter((repo) => repo && repo.fork === true && typeof repo.name === 'string')
    .map(toForkedRepoEntry)
    .sort((left, right) => Date.parse(right.updatedAt ?? 0) - Date.parse(left.updatedAt ?? 0))

  return {
    username,
    generatedAt,
    totalForks: entries.length,
    repos: entries
  }
}

async function fetchRepos(username) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': `${username}-pages-fork-refresh`
  }

  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(buildForksApiUrl(username), { headers })

  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    throw new Error(`GitHub API ${response.status}${remaining ? ` (剩余配额 ${remaining})` : ''}`)
  }

  return response.json()
}

async function main() {
  const username = process.env.FORKED_REPOS_USERNAME ?? DEFAULT_USERNAME
  const outputPath = process.env.FORKED_REPOS_OUTPUT
    ? path.resolve(process.env.FORKED_REPOS_OUTPUT)
    : DEFAULT_OUTPUT_PATH

  const repos = await fetchRepos(username)
  const payload = buildForkedReposPayload(repos, { username })

  if (payload.totalForks === 0) {
    throw new Error('没有取到任何 fork，拒绝用空数据覆盖现有快照')
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  process.stdout.write(`Wrote ${payload.totalForks} forked repos to ${path.relative(process.cwd(), outputPath)}\n`)
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  // 刷新失败时不要动已有快照，否则一次限流就会把首页数据清空。
  main().catch((error) => {
    console.error(`刷新 fork 快照失败：${error.message}`)
    process.exit(1)
  })
}
