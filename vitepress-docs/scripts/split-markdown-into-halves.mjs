import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    input: '',
    lowerFile: '',
    splitAt: '',
    upperTitle: '',
    lowerTitle: ''
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (!args.input) {
      args.input = value
      continue
    }

    if (!args.lowerFile) {
      args.lowerFile = value
      continue
    }

    if (value === '--split-at') {
      args.splitAt = argv[index + 1] ?? ''
      index += 1
      continue
    }

    if (value === '--upper-title') {
      args.upperTitle = argv[index + 1] ?? ''
      index += 1
      continue
    }

    if (value === '--lower-title') {
      args.lowerTitle = argv[index + 1] ?? ''
      index += 1
      continue
    }
  }

  if (!args.input || !args.lowerFile || !args.splitAt || !args.upperTitle || !args.lowerTitle) {
    throw new Error('Usage: node split-markdown-into-halves.mjs <input.md> <lower.md> --split-at "# x" --upper-title "标题（上）" --lower-title "标题（下）"')
  }

  return args
}

function findSplitIndex(lines, splitAt) {
  const splitLine = `# ${splitAt}`
  const index = lines.findIndex((line) => line.trim() === splitLine)

  if (index === -1) {
    throw new Error(`Cannot find split heading: ${splitLine}`)
  }

  return index
}

function buildUpperLines(lines, title) {
  const firstMeaningfulIndex = lines.findIndex((line) => line.trim() !== '')

  if (firstMeaningfulIndex !== -1 && /^#\s+/.test(lines[firstMeaningfulIndex])) {
    const updated = [...lines]
    updated[firstMeaningfulIndex] = `# ${title}`
    return updated
  }

  return [`# ${title}`, '', ...lines]
}

function trimLeadingBlankLines(lines) {
  let index = 0

  while (index < lines.length && lines[index].trim() === '') {
    index += 1
  }

  return lines.slice(index)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = path.resolve(args.input)
  const lowerPath = path.resolve(path.dirname(inputPath), args.lowerFile)
  const lowerBaseName = path.basename(lowerPath, '.md')
  const upperBaseName = path.basename(inputPath, '.md')
  const lines = fs.readFileSync(inputPath, 'utf8').split(/\r?\n/)
  const splitIndex = findSplitIndex(lines, args.splitAt)

  const upperRaw = lines.slice()
  const lowerRaw = trimLeadingBlankLines(lines.slice(splitIndex))

  upperRaw.splice(splitIndex)

  const upperLines = buildUpperLines(upperRaw, args.upperTitle)
  const upperInsertIndex = upperLines.findIndex((line) => /^#\s+/.test(line)) + 1
  upperLines.splice(upperInsertIndex, 0, '', `[继续阅读下篇](./${lowerBaseName})`, '')

  const lowerLines = [
    `# ${args.lowerTitle}`,
    '',
    `[返回上篇](./${upperBaseName})`,
    '',
    ...lowerRaw
  ]

  fs.writeFileSync(inputPath, `${upperLines.join('\n').trimEnd()}\n`)
  fs.writeFileSync(lowerPath, `${lowerLines.join('\n').trimEnd()}\n`)

  console.log(`Split ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), lowerPath)}`)
}

main()