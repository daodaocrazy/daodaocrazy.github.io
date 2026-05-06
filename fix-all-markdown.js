import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const studyDir = path.join(__dirname, 'docs', 'study')

function escapeMarkdown(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  console.log(`Processing ${filePath}...`)

  // Step 1: Extract and protect all code blocks first
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `@@@CODEBLOCK_${codeBlocks.length - 1}@@@`
  })

  // Step 2: Also extract inline code (`...`)
  const inlineCodes = []
  content = content.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match)
    return `@@@INLINECODE_${inlineCodes.length - 1}@@@`
  })

  // Step 3: Escape all remaining angle brackets (non-code)
  content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Step 4: Escape double curly braces
  content = content.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')

  // Step 5: Put inline code back
  for (let i = 0; i < inlineCodes.length; i++) {
    content = content.replace(`@@@INLINECODE_${i}@@@`, inlineCodes[i])
  }

  // Step 6: Put code blocks back
  for (let i = 0; i < codeBlocks.length; i++) {
    content = content.replace(`@@@CODEBLOCK_${i}@@@`, codeBlocks[i])
  }

  // Step 7: Remove any zero-width or other weird characters
  content = content.replace(/[\u200B-\u200D\uFEFF]/g, '')
  // Normalize newlines
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Replace non-breaking spaces with regular spaces
  content = content.replace(/\u00A0/g, ' ')

  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`Fixed ${filePath}`)
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      processDirectory(fullPath)
    } else if (stat.isFile() && file.endsWith('.md')) {
      escapeMarkdown(fullPath)
    }
  }
}

processDirectory(studyDir)
console.log('Done processing all study files!')
