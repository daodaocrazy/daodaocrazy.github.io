import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = { check: false, input: '' }

  for (const value of argv) {
    if (value === '--check') {
      args.check = true
      continue
    }

    if (!args.input) {
      args.input = value
    }
  }

  if (!args.input) {
    throw new Error('Usage: node split-markdown-by-h1.mjs [--check] <input.md>')
  }

  return args
}

function splitFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { frontmatter: '', body: source }
  }

  const end = source.indexOf('\n---\n', 4)

  if (end === -1) {
    return { frontmatter: '', body: source }
  }

  return {
    frontmatter: source.slice(0, end + 5),
    body: source.slice(end + 5)
  }
}

function collectTopLevelSections(body) {
  const lines = body.split(/\r?\n/)
  const sections = []
  let inFence = false
  let titleIndex = -1

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }

    if (inFence) {
      continue
    }

    const match = line.match(/^#\s+(.+)/)

    if (!match) {
      continue
    }

    if (titleIndex === -1) {
      titleIndex = index
      sections.push({ title: match[1].trim(), start: index, isDocumentTitle: true })
      continue
    }

    sections.push({ title: match[1].trim(), start: index, isDocumentTitle: false })
  }

  if (sections.length < 2) {
    throw new Error('Expected one document title and at least one chapter heading.')
  }

  return { lines, sections }
}

function buildChapterEntries(lines, sections) {
  const documentTitle = sections[0]
  const introStart = documentTitle.start + 1
  const introEnd = sections[1].start
  const intro = lines.slice(introStart, introEnd).join('\n').trim()
  const chapters = []

  for (let index = 1; index < sections.length; index += 1) {
    const current = sections[index]
    const next = sections[index + 1]
    const end = next ? next.start : lines.length
    const content = lines.slice(current.start, end).join('\n').trim()

    chapters.push({
      index,
      title: current.title,
      fileName: `chapter-${String(index).padStart(2, '0')}.md`,
      content
    })
  }

  return {
    documentTitle: documentTitle.title,
    intro,
    chapters
  }
}

function buildIndexContent(documentTitle, intro, chapters, folderName) {
  const lines = [`# ${documentTitle}`, '']

  if (intro) {
    lines.push(intro, '')
  }

  lines.push('## 阅读方式', '', '这篇长文已按一级章节拆分，下面每个入口只展示一个章节，按顺序阅读即可。', '', '## 章节目录', '')

  for (const chapter of chapters) {
    lines.push(`- [${chapter.title}](./${folderName}/${chapter.fileName.replace(/\.md$/, '')})`)
  }

  lines.push('')
  return `${lines.join('\n').trim()}\n`
}

function buildChapterContent(documentTitle, baseName, chapter, chapters) {
  const previousChapter = chapters[chapter.index - 2]
  const nextChapter = chapters[chapter.index]
  const navigation = [
    `[返回总览](../${baseName})`,
    previousChapter ? `[上一章：${previousChapter.title}](./${previousChapter.fileName.replace(/\.md$/, '')})` : '',
    nextChapter ? `[下一章：${nextChapter.title}](./${nextChapter.fileName.replace(/\.md$/, '')})` : ''
  ].filter(Boolean).join(' | ')

  return `> 文档：${documentTitle}\n\n${navigation}\n\n${chapter.content}\n\n---\n\n${navigation}\n`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = path.resolve(args.input)
  const baseName = path.basename(inputPath, '.md')
  const source = fs.readFileSync(inputPath, 'utf8')
  const { body } = splitFrontmatter(source)
  const { lines, sections } = collectTopLevelSections(body)
  const { documentTitle, intro, chapters } = buildChapterEntries(lines, sections)
  const folderName = `${baseName}-章节`

  if (args.check) {
    console.log(JSON.stringify({ documentTitle, chapters: chapters.map((item) => item.title) }, null, 2))
    return
  }

  const outputDir = path.join(path.dirname(inputPath), folderName)
  fs.rmSync(outputDir, { recursive: true, force: true })
  fs.mkdirSync(outputDir, { recursive: true })

  for (const chapter of chapters) {
    const chapterPath = path.join(outputDir, chapter.fileName)
    fs.writeFileSync(chapterPath, buildChapterContent(documentTitle, baseName, chapter, chapters))
  }

  fs.writeFileSync(inputPath, buildIndexContent(documentTitle, intro, chapters, folderName))

  console.log(`Split ${path.relative(process.cwd(), inputPath)} into ${chapters.length} chapter pages.`)
}

main()