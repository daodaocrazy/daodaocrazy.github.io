import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function processDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name)
    
    if (file.isDirectory()) {
      processDirectory(fullPath)
    } else if (file.name.endsWith('.md')) {
      console.log(`Processing ${fullPath}`)
      processFile(fullPath)
    }
  })
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  
  // 最激进的方法：转义所有的 < 和 >，除非它们在代码块中
  // 我们先把代码块保存起来
  const codeBlocks = []
  let codeBlockIndex = 0
  // 使用不会被转义的占位符
  content = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `@@CODEBLOCK${codeBlockIndex++}@@`
  })
  
  // 先转义 Vue 的插值语法 {{ 和 }}
  content = content.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
  
  // 现在转义所有的 < 和 >
  content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  // 然后把代码块放回去
  for (let i = 0; i < codeBlocks.length; i++) {
    content = content.replace(`@@CODEBLOCK${i}@@`, codeBlocks[i])
  }
  
  // 清理一些其他的特殊字符
  content = content
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // 零宽字符
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\u00A0/g, ' ')  // 替换非断行空格
  
  fs.writeFileSync(filePath, content, 'utf-8')
}

console.log('Starting to process markdown files...')
processDirectory(path.join(__dirname, 'docs'))
console.log('Done processing all markdown files!')
