import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const CODEX_INSTRUCTIONS = path.join(repoRoot, 'AGENTS.md')
const COPILOT_INSTRUCTIONS = path.join(repoRoot, '.github/copilot-instructions.md')

// 两个工具各读各的指令文件，内容必须手工同步。任何一条共享事实只出现在一侧，
// 就说明改动漏了另一边，这里直接失败。
const SHARED_FACTS = [
  ['构建入口在 vitepress-docs', 'vitepress-docs/'],
  ['本地校验命令', 'npm run docs:build:ci'],
  ['单元测试命令', 'npm test'],
  ['VitePress 文档源', 'vitepress-docs/docs/'],
  ['历史归档目录', 'docsify'],
  ['交互页注入方式', 'markdown.html'],
  ['Pages 构建模式', 'build_type=workflow'],
  ['预览环境分支策略', 'github-pages-preview'],
  ['预览分支通配', 'feature/*'],
  ['分支映射脚本', 'resolve-pages-target.mjs'],
  ['public GitHub 包装器', 'ghpub'],
  ['企业版 GitHub 主机', 'atc-github.azure.cloud.bmw'],
  ['独立内容域', 'shadowrocket/'],
  ['默认文档语言', '中文']
]

const readIfPresent = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null)

test('both agent instruction files exist', () => {
  assert.ok(fs.existsSync(CODEX_INSTRUCTIONS), 'AGENTS.md 缺失，Codex 读不到仓库约定')
  assert.ok(fs.existsSync(COPILOT_INSTRUCTIONS), '.github/copilot-instructions.md 缺失，Copilot 读不到仓库约定')
})

test('each instruction file points at the other as its mirror', () => {
  const codex = readIfPresent(CODEX_INSTRUCTIONS) ?? ''
  const copilot = readIfPresent(COPILOT_INSTRUCTIONS) ?? ''

  assert.match(codex, /copilot-instructions\.md/, 'AGENTS.md 必须写明 Copilot 侧副本路径')
  assert.match(codex, /两处同步|同步/, 'AGENTS.md 必须写明两处同步')
  assert.match(copilot, /AGENTS\.md/, 'copilot-instructions.md 必须写明 Codex 侧副本路径')
  assert.match(copilot, /两处同步|同步/, 'copilot-instructions.md 必须写明两处同步')
})

test('no shared fact lives in only one instruction file', () => {
  const codex = readIfPresent(CODEX_INSTRUCTIONS) ?? ''
  const copilot = readIfPresent(COPILOT_INSTRUCTIONS) ?? ''
  const missing = []

  for (const [label, token] of SHARED_FACTS) {
    const inCodex = codex.includes(token)
    const inCopilot = copilot.includes(token)

    if (!inCodex || !inCopilot) {
      missing.push(`${label}（${token}）：${inCodex ? '' : 'AGENTS.md 缺少'}${!inCodex && !inCopilot ? '，' : ''}${inCopilot ? '' : 'copilot-instructions.md 缺少'}`)
    }
  }

  assert.deepEqual(missing, [], `以下共享事实没有两边同步：\n- ${missing.join('\n- ')}`)
})

test('each instruction file names the skill directory its own tool scans', () => {
  const codex = readIfPresent(CODEX_INSTRUCTIONS) ?? ''
  const copilot = readIfPresent(COPILOT_INSTRUCTIONS) ?? ''

  assert.ok(codex.includes('.agents/skills/'), 'AGENTS.md 必须写明 Codex 扫描的仓库级 skill 目录')
  assert.ok(copilot.includes('.agents/skills/'), 'copilot-instructions.md 必须写明 Codex skill 目录，避免误放进 .github/skills')
  assert.ok(codex.includes('.github/skills/'), 'AGENTS.md 必须写明 Copilot 的 skill 目录以区分')
  assert.ok(copilot.includes('.github/skills/'), 'copilot-instructions.md 必须写明自己的 skill 目录')
})

test('the Codex skill files only use frontmatter keys Codex accepts', () => {
  const skillsRoot = path.join(repoRoot, '.agents/skills')

  if (!fs.existsSync(skillsRoot)) {
    return
  }

  const allowed = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata'])
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsRoot, dir.name, 'SKILL.md')

    assert.ok(fs.existsSync(skillPath), `${dir.name}: 缺少 SKILL.md`)

    const source = fs.readFileSync(skillPath, 'utf8')
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/)

    assert.ok(frontmatter, `${dir.name}: 缺少 YAML frontmatter`)

    const keys = frontmatter[1]
      .split('\n')
      .filter((line) => /^[A-Za-z][A-Za-z0-9_-]*:/.test(line))
      .map((line) => line.slice(0, line.indexOf(':')))

    const unexpected = keys.filter((key) => !allowed.has(key))

    assert.deepEqual(unexpected, [], `${dir.name}: Codex 不接受的 frontmatter 字段 ${unexpected.join(', ')}`)
    assert.ok(keys.includes('name'), `${dir.name}: 缺少 name`)
    assert.ok(keys.includes('description'), `${dir.name}: 缺少 description`)
  }
})
