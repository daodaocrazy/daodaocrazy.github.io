import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vitepressCli = path.resolve(__dirname, '../node_modules/vitepress/dist/node/cli.js')

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

const options = parseArgs(process.argv.slice(2))

const child = spawn(process.execPath, [vitepressCli, 'build', 'docs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITEPRESS_BASE_PATH: options.base,
    DOCS_CONTENT_REF: options.ref
  }
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
