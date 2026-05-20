import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const componentPath = path.resolve(testDir, '../docs/.vitepress/theme/components/MetalsMarketWorkbench.vue')
const customCssPath = path.resolve(testDir, '../docs/.vitepress/theme/custom.css')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const customCssSource = fs.readFileSync(customCssPath, 'utf8')

test('metals market page uses site theme tokens instead of the old hard-coded palette', () => {
  assert.match(componentSource, /var\(--vp-c-brand-1\)/)
  assert.match(componentSource, /var\(--vp-c-text-1\)/)
  assert.match(componentSource, /var\(--vp-c-bg/)

  assert.doesNotMatch(componentSource, /#eef4fb/i)
  assert.doesNotMatch(componentSource, /#f2c27d/i)
  assert.doesNotMatch(componentSource, /#f7d2a5/i)
  assert.doesNotMatch(componentSource, /rgba\(197,\s*136,\s*71,\s*0\.16\)/i)
  assert.doesNotMatch(componentSource, /rgba\(12,\s*23,\s*36,\s*0\.96\)/i)
  assert.doesNotMatch(componentSource, /rgba\(28,\s*42,\s*61,\s*0\.92\)/i)
})

test('metals market page defines dedicated VPPage spacing rules', () => {
  assert.match(customCssSource, /\.metals-market-snapshot-page \.VPPage/)
  assert.match(customCssSource, /padding-inline:\s*clamp\(/)
})