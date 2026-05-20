const DEFAULT_API_BASE_URL = 'https://api.github.com'

function parseArgs(argv) {
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (!argument.startsWith('--')) {
      continue
    }

    const [key, inlineValue] = argument.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]

    if (inlineValue == null) {
      index += 1
    }

    options[key] = value
  }

  return options
}

function resolveRepository(options) {
  const [ownerFromEnv, repoFromEnv] = (process.env.GITHUB_REPOSITORY ?? '').split('/', 2)

  return {
    owner: options.owner ?? ownerFromEnv,
    repo: options.repo ?? repoFromEnv,
    branchName: options.branch ?? process.env.GITHUB_REF_NAME
  }
}

function buildHeaders(token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28'
  }

  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  return headers
}

async function fetchJson(url, token, { allow404 = false } = {}) {
  const response = await fetch(url, {
    headers: buildHeaders(token)
  })

  if (allow404 && response.status === 404) {
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} for ${url}\n${body}`)
  }

  return response.json()
}

export function requiredPoliciesForBranch(branchName) {
  if (branchName === 'main') {
    return [{ environmentName: 'github-pages', pattern: 'main' }]
  }

  if (branchName === 'lab') {
    return [{ environmentName: 'github-pages', pattern: 'lab' }]
  }

  if (branchName?.startsWith('feature/')) {
    return [{ environmentName: 'github-pages-preview', pattern: 'feature/*' }]
  }

  return []
}

export function collectPagesDeploymentIssues({ branchName, pagesSite, environmentPolicies }) {
  const issues = []
  const buildType = pagesSite?.build_type ?? 'unknown'
  const sourceBranch = pagesSite?.source?.branch ?? 'unknown'
  const sourcePath = pagesSite?.source?.path ?? 'unknown'

  if (buildType !== 'workflow') {
    issues.push(`GitHub Pages build_type 当前为 ${buildType}（source: ${sourceBranch}:${sourcePath}），必须切换为 workflow。`)
  }

  for (const requirement of requiredPoliciesForBranch(branchName)) {
    const currentPolicies = environmentPolicies?.[requirement.environmentName] ?? []

    if (!currentPolicies.includes(requirement.pattern)) {
      issues.push(`环境 ${requirement.environmentName} 缺少允许 ${requirement.pattern} 的 deployment branch policy。`)
    }
  }

  return issues
}

export async function fetchPagesSite({ owner, repo, token, apiBaseUrl = DEFAULT_API_BASE_URL }) {
  return fetchJson(`${apiBaseUrl}/repos/${owner}/${repo}/pages`, token)
}

export async function fetchDeploymentBranchPolicies({
  owner,
  repo,
  environmentName,
  token,
  apiBaseUrl = DEFAULT_API_BASE_URL
}) {
  const payload = await fetchJson(
    `${apiBaseUrl}/repos/${owner}/${repo}/environments/${encodeURIComponent(environmentName)}/deployment-branch-policies`,
    token,
    { allow404: true }
  )

  return payload?.branch_policies?.map((policy) => policy.name) ?? []
}

export async function verifyPagesConfig({
  owner,
  repo,
  branchName,
  token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '',
  apiBaseUrl = DEFAULT_API_BASE_URL
}) {
  const pagesSite = await fetchPagesSite({ owner, repo, token, apiBaseUrl })
  const requirements = requiredPoliciesForBranch(branchName)
  const uniqueEnvironmentNames = [...new Set(requirements.map((item) => item.environmentName))]
  const environmentPolicies = {}

  for (const environmentName of uniqueEnvironmentNames) {
    environmentPolicies[environmentName] = await fetchDeploymentBranchPolicies({
      owner,
      repo,
      environmentName,
      token,
      apiBaseUrl
    })
  }

  return {
    pagesSite,
    environmentPolicies,
    issues: collectPagesDeploymentIssues({ branchName, pagesSite, environmentPolicies })
  }
}

function printSuccessSummary({ branchName, pagesSite, environmentPolicies }) {
  const sourceBranch = pagesSite?.source?.branch ?? 'unknown'
  const sourcePath = pagesSite?.source?.path ?? 'unknown'

  process.stdout.write(`GitHub Pages 配置预检通过：${branchName}\n`)
  process.stdout.write(`- build_type=${pagesSite.build_type}\n`)
  process.stdout.write(`- source=${sourceBranch}:${sourcePath}\n`)

  for (const [environmentName, policies] of Object.entries(environmentPolicies)) {
    process.stdout.write(`- ${environmentName} policies=${policies.join(', ') || '(none)'}\n`)
  }
}

function printFailureSummary({ branchName, pagesSite, issues }) {
  const sourceBranch = pagesSite?.source?.branch ?? 'unknown'
  const sourcePath = pagesSite?.source?.path ?? 'unknown'

  process.stderr.write(`GitHub Pages 配置预检失败：${branchName}\n`)
  process.stderr.write(`- build_type=${pagesSite?.build_type ?? 'unknown'}\n`)
  process.stderr.write(`- source=${sourceBranch}:${sourcePath}\n`)

  for (const issue of issues) {
    process.stderr.write(`- ${issue}\n`)
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  const { owner, repo, branchName } = resolveRepository(options)

  if (!owner || !repo || !branchName) {
    throw new Error('owner、repo 和 branchName 必须可解析；请传入 --owner、--repo、--branch 或设置 GITHUB_REPOSITORY / GITHUB_REF_NAME。')
  }

  const result = await verifyPagesConfig({ owner, repo, branchName })

  if (result.issues.length > 0) {
    printFailureSummary({ branchName, pagesSite: result.pagesSite, issues: result.issues })
    process.exitCode = 1
    return
  }

  printSuccessSummary({ branchName, pagesSite: result.pagesSite, environmentPolicies: result.environmentPolicies })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}