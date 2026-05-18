function slugifyBranch(branchName) {
  const normalized = branchName
    .trim()
    .toLowerCase()
    .replace(/^feature\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'preview'
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') {
    return '/'
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`
}

function resolveTarget(branchName) {
  if (branchName === 'main') {
    return {
      channel: 'production',
      base_path: '/',
      deploy_subdir: '',
      environment_name: 'github-pages',
      preview_slug: ''
    }
  }

  if (branchName === 'lab') {
    return {
      channel: 'lab',
      base_path: '/lab/',
      deploy_subdir: 'lab',
      environment_name: 'github-pages',
      preview_slug: ''
    }
  }

  if (branchName.startsWith('feature/')) {
    const previewSlug = slugifyBranch(branchName)
    const deploySubdir = `preview/${previewSlug}`

    return {
      channel: 'preview',
      base_path: normalizeBasePath(deploySubdir),
      deploy_subdir: deploySubdir,
      environment_name: 'github-pages',
      preview_slug: previewSlug
    }
  }

  throw new Error(`Unsupported Pages target branch: ${branchName}`)
}

function printGithubOutput(target) {
  for (const [key, value] of Object.entries(target)) {
    process.stdout.write(`${key}=${value}\n`)
  }
}

const [branchName, format = '--format=plain'] = process.argv.slice(2)

if (!branchName) {
  throw new Error('Branch name is required')
}

const target = resolveTarget(branchName)

if (format === '--format=github-output') {
  printGithubOutput(target)
} else {
  process.stdout.write(`${JSON.stringify(target, null, 2)}\n`)
}
