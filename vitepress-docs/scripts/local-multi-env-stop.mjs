import fs from 'node:fs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

const defaultPort = 4175
const defaultPidFile = `${os.tmpdir()}/daodao-multi-preview.pid`

function parseArgs(argv) {
  const options = {
    port: defaultPort,
    pidFile: defaultPidFile
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--port' && next) {
      options.port = Number(next)
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

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM')
    return true
  } catch {
    return false
  }
}

function killByPort(port) {
  const result = spawnSync('zsh', ['-lc', `lsof -tiTCP:${port} -sTCP:LISTEN`], { encoding: 'utf8' })
  const pids = result.stdout.split(/\s+/).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0)

  for (const pid of pids) {
    killPid(pid)
  }

  return pids
}

const options = parseArgs(process.argv.slice(2))
const stopped = []

if (fs.existsSync(options.pidFile)) {
  const pid = Number(fs.readFileSync(options.pidFile, 'utf8').trim())
  if (Number.isInteger(pid) && pid > 0 && isAlive(pid) && killPid(pid)) {
    stopped.push(pid)
  }
  fs.rmSync(options.pidFile, { force: true })
}

for (const pid of killByPort(options.port)) {
  if (!stopped.includes(pid)) {
    stopped.push(pid)
  }
}

if (stopped.length === 0) {
  process.stdout.write(`No preview process was listening on ${options.port}.\n`)
} else {
  process.stdout.write(`Stopped preview process(es): ${stopped.join(', ')}\n`)
}
