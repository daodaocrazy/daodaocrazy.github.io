import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const problematicFiles = [
  'docs/study/BigData/HBase/HBase学习笔记.md',
  'docs/study/BigData/理论/数据密集型应用系统设计-学习笔记-02.md',
  'docs/study/DataBase/DatabaseSystem-Design/数据库系统内幕-学习笔记-01.md'
]

problematicFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullPath)) {
    console.log(`Processing ${filePath}...`)
    let content = fs.readFileSync(fullPath, 'utf-8')
    
    // 移除可能导致问题的不可见字符和特殊序列
    content = content
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // 移除零宽字符
      .replace(/\r\n/g, '\n')                // 统一换行符
      .replace(/\u00A0/g, ' ')               // 替换非断行空格
    
    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`Fixed ${filePath}`)
  }
})

console.log('Done!')
