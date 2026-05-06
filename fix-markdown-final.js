import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function escapeMarkdownFile(filePath) {
  console.log(`Processing: ${filePath}`)
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Step 1: Find and store all code blocks
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```/g, function (match) {
    codeBlocks.push(match)
    return `@@@CODE_BLOCK_${codeBlocks.length - 1}@@@`
  })
  
  // Step 2: Now escape all problematic characters outside of code blocks
  // a. Escape HTML tags
  content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // b. Escape Vue mustache syntax
  content = content.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
  
  // Step 3: Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    content = content.replace(`@@@CODE_BLOCK_${i}@@@`, codeBlocks[i])
  }
  
  // Step 4: Clean up any other zero-width characters and normalize newlines
  content = content.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ')
  
  fs.writeFileSync(filePath, content, 'utf8')
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      processDirectory(fullPath)
    } else if (file.name.endsWith('.md')) {
      // Skip index.md
      if (file.name !== 'index.md') {
        escapeMarkdownFile(fullPath)
      }
    }
  }
}

console.log('Starting final markdown processing...')
processDirectory(path.join(__dirname, 'docs', 'study'))
console.log('Done!')
