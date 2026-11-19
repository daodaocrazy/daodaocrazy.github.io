import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const studyRoot = path.join(repoRoot, 'vitepress-docs/docs/study')

function collectMarkdownFiles(dir) {
  const files = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(full))
    } else if (entry.name.endsWith('.md')) {
      files.push(full)
    }
  }

  return files
}

// 这批笔记是从富文本/HTML 转成 Markdown 的，转换过程会把一个链接写成
// [文字]([编码URL](明文URL))。VitePress 会把 [编码URL](明文URL) 整体当成相对路径，
// 渲染出 ./%5Bhttps://... 这种点开即 404 的链接。
//
// 2026-11 修掉 122 处后留下这个守护。config.js 里 ignoreDeadLinks 是 true，
// 这类问题不会让构建失败，所以需要测试兜住。
const NESTED_LINK = /\]\(\[(https?:\/\/[^()\s]+)\]\((https?:\/\/[^()\s]+)\)\)/g

// 正文里的本地服务地址以及转换时已经丢失目标的老链接不在本测试范围内。
// 前者是笔记的正常内容，后者原始 URL 已不可恢复。

test('study markdown does not contain nested duplicate links', () => {
  assert.ok(fs.existsSync(studyRoot), `study 目录不存在：${studyRoot}`)

  const offenders = []

  for (const file of collectMarkdownFiles(studyRoot)) {
    const source = fs.readFileSync(file, 'utf8')
    const matches = source.match(NESTED_LINK)

    if (matches) {
      offenders.push(`${path.relative(repoRoot, file)} — ${matches.length} 处`)
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `以下文件又出现了嵌套重复链接，请把它改写成 [文字](明文URL)：\n- ${offenders.join('\n- ')}`
  )
})

test('the nested-link guard actually matches the shape it forbids', () => {
  const sample = '[虚拟机监视程序--百度百科]([https://baike.baidu.com/item/%E8%99%9A%E6%8B%9F%E6%9C%BA](https://baike.baidu.com/item/虚拟机监视程序/20839241))'
  const plain = '[a](https://example.com)'

  assert.ok(sample.match(NESTED_LINK), '守护没有匹配到已知的坏形态，等于失效')
  assert.equal(plain.match(NESTED_LINK), null, '守护不应误报正常链接')
})
