import fs from 'node:fs'
import os from 'node:os'
import http from 'node:http'

const defaultPort = 4175
const defaultPidFile = `${os.tmpdir()}/daodao-multi-preview.pid`

function parseArgs(argv) {
  const options = {
    port: defaultPort,
    pidFile: defaultPidFile,
    checkPaths: ['/lab/', '/worktree/']
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
      continue
    }

    if (current === '--check-path' && next) {
      options.checkPaths.push(next)
      index += 1
    }
  }

  return options
}

function requestStatus(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (response) => {
      response.resume()
      resolve(response.statusCode ?? 0)
    })

    req.setTimeout(3000, () => {
      req.destroy()
      resolve(0)
    })

    req.on('error', () => resolve(0))
  })
}

const options = parseArgs(process.argv.slice(2))
const pid = fs.existsSync(options.pidFile) ? fs.readFileSync(options.pidFile, 'utf8').trim() : 'missing'
const rootStatus = await requestStatus(`http://127.0.0.1:${options.port}/`)
const extraStatuses = await Promise.all(options.checkPaths.map(async (checkPath) => ({
  path: checkPath,
  status: await requestStatus(`http://127.0.0.1:${options.port}${checkPath}`)
})))

process.stdout.write(`port=${options.port}\n`)
process.stdout.write(`pid_file=${options.pidFile}\n`)
process.stdout.write(`pid=${pid}\n`)
process.stdout.write(`root_status=${rootStatus}\n`)
for (const item of extraStatuses) {
  const key = item.path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '_') || 'root'
  process.stdout.write(`${key}_status=${item.status}\n`)
}
