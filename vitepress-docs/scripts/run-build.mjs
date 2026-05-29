import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { syncTravelMemoryArtifacts } from './travel-memory-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vitepressCli = path.resolve(__dirname, '../node_modules/vitepress/dist/node/cli.js')

function parseNodeMajor(version) {
  const match = /^v(\d+)/.exec(version)
  return match ? Number.parseInt(match[1], 10) : Number.NaN
}

function runChild(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      resolve(code ?? 1)
    })
  })
}

function parseArgs(argv) {
  const options = {
    base: '/',
    ref: 'main'
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--base' && next) {
      options.base = next
      index += 1
      continue
    }

    if (current === '--ref' && next) {
      options.ref = next
      index += 1
    }
  }

  return options
}

async function main() {
  const nodeMajor = parseNodeMajor(process.version)
  const shouldReexecWithNode22 = nodeMajor >= 25 && process.env.VITEPRESS_DOCS_NODE22_REEXEC !== '1'

  if (shouldReexecWithNode22) {
    console.warn(
      `[vitepress-docs] Detected unsupported Node runtime ${process.version} for VitePress build; re-running with Node 22.`
    )

    const exitCode = await runChild('npx', ['-y', 'node@22', process.argv[1], ...process.argv.slice(2)], {
      ...process.env,
      VITEPRESS_DOCS_NODE22_REEXEC: '1'
    })

    process.exit(exitCode)
  }

  syncTravelMemoryArtifacts({
    tripsDir: path.resolve(__dirname, '../docs/.data/travel/trips'),
    derivedIndexPath: path.resolve(__dirname, '../docs/.data/travel/derived/travel-index.json'),
    generatedPagesDir: path.resolve(__dirname, '../docs/travel/_generated')
  })

  const options = parseArgs(process.argv.slice(2))
  const exitCode = await runChild(process.execPath, [vitepressCli, 'build', 'docs'], {
    ...process.env,
    VITEPRESS_BASE_PATH: options.base,
    DOCS_CONTENT_REF: options.ref
  })

  process.exit(exitCode)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
