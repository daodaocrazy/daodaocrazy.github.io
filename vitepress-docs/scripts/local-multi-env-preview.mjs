import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const vitepressRoot = path.resolve(__dirname, '..')
const vitepressCli = path.resolve(vitepressRoot, 'node_modules/vitepress/dist/node/cli.js')

function parseArgs(argv) {
  const options = {
    port: 4175,
    rootRef: 'main',
    mounts: [],
    previewRefs: [],
    pidFile: path.join(os.tmpdir(), 'daodao-multi-preview.pid')
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--port' && next) {
      options.port = Number(next)
      index += 1
      continue
    }

    if (current === '--root-ref' && next) {
      options.rootRef = next
      index += 1
      continue
    }

    if (current === '--mount' && next) {
      const mountValue = next
      const [rawPath, rawRef] = mountValue.split('=')

      if (!rawPath) {
        throw new Error(`Invalid --mount value: ${mountValue}`)
      }

      options.mounts.push({
        path: normalizeMountPath(rawPath),
        ref: rawRef || 'worktree'
      })
      index += 1
      continue
    }

    if (current === '--preview-ref' && next) {
      options.previewRefs.push(next)
      index += 1
      continue
    }

    if (current === '--pid-file' && next) {
      options.pidFile = next
      index += 1
    }
  }

  return options
}

function slugifyRefName(refName) {
  return refName
    .trim()
    .toLowerCase()
    .replace(/^origin\//, '')
    .replace(/^feature\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preview'
}

function buildPreviewMounts(previewRefs) {
  return previewRefs.map((ref) => ({
    path: normalizeMountPath(`/preview/${slugifyRefName(ref)}/`),
    ref
  }))
}

function normalizeMountPath(value) {
  if (!value || value === '/') {
    return '/'
  }

  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function removeDirIfExists(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function ensurePortAvailable(port, pidFile) {
  if (!fs.existsSync(pidFile)) {
    return
  }

  const rawPid = fs.readFileSync(pidFile, 'utf8').trim()
  const pid = Number(rawPid)

  if (!Number.isInteger(pid) || pid <= 0) {
    fs.rmSync(pidFile, { force: true })
    return
  }

  if (!isProcessAlive(pid)) {
    fs.rmSync(pidFile, { force: true })
    return
  }

  throw new Error(`Port ${port} appears to be in use by an existing preview process (pid ${pid}). Run npm run docs:preview:multi:stop first.`)
}

function registerPidFile(pidFile) {
  fs.writeFileSync(pidFile, `${process.pid}\n`)

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) {
        const current = fs.readFileSync(pidFile, 'utf8').trim()
        if (current === String(process.pid)) {
          fs.rmSync(pidFile, { force: true })
        }
      }
    } catch {
      // noop
    }
  }

  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr}`))
      }
    })
  })
}

async function exportRef(sourceRef, destination) {
  ensureDir(destination)
  const archiveCommand = `git archive --format=tar ${sourceRef} vitepress-docs | tar -xf - -C ${shellEscape(destination)}`
  await run('zsh', ['-lc', archiveCommand], { cwd: repoRoot })

  const nodeModulesLink = path.join(destination, 'vitepress-docs/node_modules')
  removeDirIfExists(nodeModulesLink)
  fs.symlinkSync(path.join(vitepressRoot, 'node_modules'), nodeModulesLink, 'dir')
}

function shellEscape(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

async function buildDocs(projectRoot, basePath, contentRef) {
  await run(process.execPath, [vitepressCli, 'build', 'docs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      VITEPRESS_BASE_PATH: basePath,
      DOCS_CONTENT_REF: contentRef
    }
  })

  return path.join(projectRoot, 'docs/.vitepress/dist')
}

function refExists(sourceRef) {
  if (sourceRef === 'worktree') {
    return true
  }

  const directRef = spawnSync('git', ['rev-parse', '--verify', `${sourceRef}^{commit}`], {
    cwd: repoRoot,
    stdio: 'ignore'
  })

  if (directRef.status === 0) {
    return true
  }

  const remoteRef = spawnSync('git', ['rev-parse', '--verify', `origin/${sourceRef}^{commit}`], {
    cwd: repoRoot,
    stdio: 'ignore'
  })

  return remoteRef.status === 0
}

function resolveSourceRef(sourceRef) {
  if (sourceRef === 'worktree') {
    return 'worktree'
  }

  if (refExists(sourceRef)) {
    return sourceRef
  }

  if (refExists(`origin/${sourceRef}`)) {
    return `origin/${sourceRef}`
  }

  process.stdout.write(`Warning: ref ${sourceRef} not found locally. Falling back to worktree.\n`)
  return 'worktree'
}

async function prepareSourceRoot(workspaceRoot, sourceRef) {
  const resolvedRef = resolveSourceRef(sourceRef)

  if (resolvedRef === 'worktree') {
    return {
      projectRoot: vitepressRoot,
      label: sourceRef === 'worktree' ? 'worktree' : `${sourceRef} -> worktree`
    }
  }

  const exportRoot = path.join(workspaceRoot, `${resolvedRef.replace(/[^a-zA-Z0-9_-]+/g, '-')}-src`)
  await exportRef(resolvedRef, exportRoot)

  return {
    projectRoot: path.join(exportRoot, 'vitepress-docs'),
    label: resolvedRef
  }
}

function copyDirContents(sourceDir, targetDir) {
  ensureDir(targetDir)

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      copyDirContents(sourcePath, targetPath)
      continue
    }

    fs.copyFileSync(sourcePath, targetPath)
  }
}

function ensureHtmlFallback(siteRoot) {
  const rootIndex = path.join(siteRoot, 'index.html')
  const root404 = path.join(siteRoot, '404.html')

  if (!fs.existsSync(root404) && fs.existsSync(rootIndex)) {
    fs.copyFileSync(rootIndex, root404)
  }

  for (const entry of fs.readdirSync(siteRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }

    const sectionIndex = path.join(siteRoot, entry.name, 'index.html')
    const section404 = path.join(siteRoot, entry.name, '404.html')

    if (fs.existsSync(sectionIndex) && !fs.existsSync(section404)) {
      fs.copyFileSync(sectionIndex, section404)
    }
  }
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg'
  if (filePath.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

function resolveFile(siteRoot, requestPathname) {
  const safePath = decodeURIComponent(requestPathname.split('?')[0])
  const relativePath = safePath.replace(/^\/+/, '')
  const candidates = []

  if (!relativePath) {
    candidates.push('index.html')
  } else {
    candidates.push(relativePath)
    candidates.push(`${relativePath}.html`)
    candidates.push(path.join(relativePath, 'index.html'))
  }

  for (const candidate of candidates) {
    const filePath = path.resolve(siteRoot, candidate)

    if (!filePath.startsWith(siteRoot)) {
      continue
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath
    }
  }

  const topSegment = safePath.split('/').filter(Boolean)[0]

  if (topSegment) {
    const section404 = path.join(siteRoot, topSegment, '404.html')
    if (fs.existsSync(section404)) {
      return section404
    }
  }

  const root404 = path.join(siteRoot, '404.html')
  if (fs.existsSync(root404)) {
    return root404
  }

  return null
}

function startServer(siteRoot, port, info) {
  const server = http.createServer((request, response) => {
    const filePath = resolveFile(siteRoot, request.url || '/')

    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not Found')
      return
    }

    response.writeHead(200, {
      'content-type': contentType(filePath),
      'cache-control': 'no-store'
    })
    fs.createReadStream(filePath).pipe(response)
  })

  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`\nLocal multi-env preview is ready.\n`)
    process.stdout.write(`Root (${info.rootRef}): http://127.0.0.1:${port}/\n`)
    for (const mount of info.mounts) {
      process.stdout.write(`Mounted (${mount.ref}): http://127.0.0.1:${port}${mount.path}\n`)
    }
    process.stdout.write(`PID file: ${info.pidFile}\n`)
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const previewMounts = buildPreviewMounts(options.previewRefs)
  const mounts = options.mounts.length > 0 || previewMounts.length > 0
    ? options.mounts
        .concat(previewMounts)
    : [
        { path: '/lab/', ref: 'lab' },
        { path: '/worktree/', ref: 'worktree' }
      ].concat(previewMounts)
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'daodao-pages-preview-'))
  const siteRoot = path.join(workspaceRoot, 'site')

  ensurePortAvailable(options.port, options.pidFile)
  registerPidFile(options.pidFile)

  process.stdout.write(`Preparing root snapshot from ${options.rootRef}...\n`)
  const rootSource = await prepareSourceRoot(workspaceRoot, options.rootRef)

  process.stdout.write(`\nBuilding root site from ${options.rootRef}...\n`)
  const mainDist = await buildDocs(rootSource.projectRoot, '/', options.rootRef)

  removeDirIfExists(siteRoot)
  ensureDir(siteRoot)
  copyDirContents(mainDist, siteRoot)

  for (const mount of mounts) {
    const mountSource = await prepareSourceRoot(workspaceRoot, mount.ref)
    process.stdout.write(`\nBuilding mounted site from ${mount.ref} at ${mount.path}...\n`)
    const mountDist = await buildDocs(mountSource.projectRoot, mount.path, mount.ref)

    const mountDir = path.join(siteRoot, mount.path.replace(/^\/+|\/+$/g, ''))
    removeDirIfExists(mountDir)
    ensureDir(mountDir)
    copyDirContents(mountDist, mountDir)
  }

  ensureHtmlFallback(siteRoot)

  startServer(siteRoot, options.port, {
    rootRef: options.rootRef,
    mounts,
    pidFile: options.pidFile
  })
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
