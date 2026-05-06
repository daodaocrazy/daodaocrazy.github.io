import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function escapeMarkdownFile(filePath) {
  console.log(`Processing: ${filePath}`)
  let content = fs.readFileSync(filePath, 'utf8')
  
  // First, extract all code blocks
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })
  
  // Now escape all < and > characters in the remaining text
  content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  // Also escape {{ and }} to prevent Vue interpolation
  content = content.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
  
  // Put the code blocks back
  for (let i = 0; i < codeBlocks.length; i++) {
    content = content.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i])
  }
  
  // Clean up zero-width characters and normalize newlines
  content = content
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
  
  fs.writeFileSync(filePath, content, 'utf8')
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      processDirectory(fullPath)
    } else if (file.name.endsWith('.md') && !file.name.startsWith('index')) {
      // Skip index.md since we need its frontmatter intact
      escapeMarkdownFile(fullPath)
    }
  }
}

console.log('Starting markdown processing...')
processDirectory(path.join(__dirname, 'docs', 'study'))
console.log('Done!')
