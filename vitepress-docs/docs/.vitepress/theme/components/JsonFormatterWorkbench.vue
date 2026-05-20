<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import JsonFormatterTreeNode from './JsonFormatterTreeNode.vue'
import {
  collectExpandablePaths,
  createInitialExpandedPaths,
  isExpandable,
  parseJsonInput,
  repairDoubleEscapedQuotes,
  tokenizeJsonText
} from '../utils/json-formatter.mjs'

const rawInput = ref('')
const formattedOutput = ref('')
const parsedValue = ref(null)
const parseError = ref(null)
const repairSuggestion = ref(null)
const transformMode = ref('format')
const selectedPath = ref('$')
const expandedPaths = ref(new Set())
const activeResultView = ref('text')
const statusTone = ref('info')
const defaultStatusMessage = '粘贴 JSON 后会自动解析，右侧会同步展示结果与折叠视图。'
const statusMessage = ref(defaultStatusMessage)
const AUTO_PARSE_DELAY = 250

let autoParseTimer = null
let skipAutoParse = false

const inputPlaceholder = `{
  "name": "Copilot",
  "profile": {
    "role": "assistant"
  },
  "items": [1, 2, 3]
}`

const hasResult = computed(() => parsedValue.value !== null && !parseError.value && formattedOutput.value !== '')
const canCopy = computed(() => hasResult.value && formattedOutput.value !== '')
const rootExpandable = computed(() => isExpandable(parsedValue.value))
const formattedTokens = computed(() => tokenizeJsonText(formattedOutput.value))
const expandableNodeCount = computed(() => {
  if (parsedValue.value === null) {
    return 0
  }

  return collectExpandablePaths(parsedValue.value).length
})

const statusClassName = computed(() => `is-${statusTone.value}`)

function setStatus(tone, message) {
  statusTone.value = tone
  statusMessage.value = message
}

function clearAutoParseTimer() {
  if (autoParseTimer !== null) {
    clearTimeout(autoParseTimer)
    autoParseTimer = null
  }
}

function setRawInput(value) {
  skipAutoParse = true
  rawInput.value = value
}

function resetWorkbenchState(message = defaultStatusMessage) {
  formattedOutput.value = ''
  parsedValue.value = null
  parseError.value = null
  repairSuggestion.value = null
  selectedPath.value = '$'
  expandedPaths.value = new Set()
  activeResultView.value = 'text'
  setStatus('info', message)
}

function buildSuccessMessage(mode, options, repairCount = 0) {
  const suffix = `可浏览 ${expandableNodeCount.value} 个可展开节点。`
  let actionText = mode === 'minify' ? '压缩' : '格式化'

  if (options.autoTriggered) {
    actionText = mode === 'minify' ? '自动解析并压缩' : '自动解析'
  }

  if (repairCount > 0) {
    return `已自动修复 ${repairCount} 处双重转义并完成${actionText}，${suffix}`
  }

  if (options.repairDoubleEscapedQuotes) {
    return `未发现需要修复的双重转义，已直接${actionText}，${suffix}`
  }

  return `${actionText}完成，${suffix}`
}

function applyTransform(mode, options = {}) {
  clearAutoParseTimer()

  const result = parseJsonInput(rawInput.value, options)

  if (!result.ok) {
    const repairAttempt = repairDoubleEscapedQuotes(rawInput.value)

    formattedOutput.value = ''
    parsedValue.value = null
    parseError.value = result.error
    repairSuggestion.value = repairAttempt.ok && repairAttempt.repairCount > 0
      ? { repairCount: repairAttempt.repairCount }
      : null
    selectedPath.value = '$'
    expandedPaths.value = new Set()
    activeResultView.value = 'text'

    if (result.error.position === null) {
      setStatus(
        'danger',
        repairSuggestion.value
          ? `${result.error.message} 检测到可能存在双重转义，可点击“自动修复双重转义”。`
          : result.error.message
      )
      return
    }

    setStatus(
      'danger',
      repairSuggestion.value
        ? `解析失败：第 ${result.error.line} 行，第 ${result.error.column} 列。检测到可能存在双重转义，可点击“自动修复双重转义”。`
        : `解析失败：第 ${result.error.line} 行，第 ${result.error.column} 列。`
    )
    return
  }

  if (result.repairedSource) {
    setRawInput(result.repairedSource)
  }

  parsedValue.value = result.value
  formattedOutput.value = mode === 'minify' ? result.minified : result.formatted
  parseError.value = null
  repairSuggestion.value = null
  selectedPath.value = '$'
  expandedPaths.value = new Set(createInitialExpandedPaths(result.value))
  activeResultView.value = 'text'

  setStatus('success', buildSuccessMessage(mode, options, result.repairCount))
}

function handleTransform(mode) {
  transformMode.value = mode
  applyTransform(mode)
}

function handleRepairDoubleEscapedQuotes() {
  transformMode.value = 'format'
  applyTransform('format', { repairDoubleEscapedQuotes: true })
}

function handleExpandAll() {
  if (parsedValue.value === null) {
    return
  }

  expandedPaths.value = new Set(collectExpandablePaths(parsedValue.value))
  activeResultView.value = 'tree'
  setStatus('info', '已展开全部对象和数组节点。')
}

function handleCollapseAll() {
  if (parsedValue.value === null) {
    return
  }

  expandedPaths.value = new Set()
  activeResultView.value = 'tree'
  setStatus('info', '已折叠全部对象和数组节点。')
}

function handleClear() {
  clearAutoParseTimer()
  setRawInput('')
  resetWorkbenchState('输入和结果已清空。')
}

async function handleCopy() {
  if (!canCopy.value) {
    return
  }

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard-unavailable')
    }

    await navigator.clipboard.writeText(formattedOutput.value)
    setStatus('success', '结果已复制到剪贴板。')
  } catch {
    setStatus('warning', '复制失败，请手动复制结果文本。')
  }
}

function handleTogglePath(path) {
  const nextPaths = new Set(expandedPaths.value)

  if (nextPaths.has(path)) {
    nextPaths.delete(path)
  } else {
    nextPaths.add(path)
  }

  expandedPaths.value = nextPaths
}

function handleSelectPath(path) {
  selectedPath.value = path
  setStatus('info', `当前路径：${path}`)
}

watch(rawInput, (value) => {
  if (skipAutoParse) {
    skipAutoParse = false
    return
  }

  clearAutoParseTimer()

  if (value.trim() === '') {
    resetWorkbenchState(defaultStatusMessage)
    return
  }

  setStatus('info', '正在自动解析...')
  autoParseTimer = setTimeout(() => {
    applyTransform(transformMode.value, { autoTriggered: true })
  }, AUTO_PARSE_DELAY)
})

onBeforeUnmount(() => {
  clearAutoParseTimer()
})
</script>

<template>
  <section class="json-formatter-workbench">
    <header class="json-formatter-workbench__header">
      <div class="json-formatter-workbench__title">
        <p class="json-formatter-workbench__eyebrow">Tool Box</p>
        <h2>JSON Formatter</h2>
        <p class="json-formatter-workbench__intro">
          参考在线 JSON 工具的双栏工作流，聚焦自动解析、压缩、错误定位与折叠视图浏览。
        </p>
      </div>

      <div class="json-formatter-workbench__toolbar">
        <button type="button" class="json-button json-button--brand" @click="handleTransform('format')">格式化</button>
        <button type="button" class="json-button json-button--brand" @click="handleTransform('minify')">压缩</button>
        <button type="button" class="json-button" @click="handleRepairDoubleEscapedQuotes">自动修复双重转义</button>
        <button type="button" class="json-button" :disabled="parsedValue === null" @click="handleExpandAll">展开全部</button>
        <button type="button" class="json-button" :disabled="parsedValue === null" @click="handleCollapseAll">折叠全部</button>
        <button type="button" class="json-button" :disabled="!canCopy" @click="handleCopy">复制结果</button>
        <button type="button" class="json-button" @click="handleClear">清空</button>
      </div>
    </header>

    <div class="json-formatter-workbench__statusbar" :class="statusClassName">
      <span class="json-status-pill">{{ statusTone }}</span>
      <p>{{ statusMessage }}</p>
      <code v-if="parsedValue !== null" class="json-path-pill">{{ selectedPath }}</code>
    </div>

    <div class="json-formatter-workbench__grid">
      <section class="json-panel">
        <div class="json-panel__head">
          <div>
            <h3>原始 JSON</h3>
            <p>支持直接粘贴对象、数组或基础值 JSON。</p>
          </div>
          <span class="json-panel__meta">输入后自动解析</span>
        </div>

        <textarea
          v-model="rawInput"
          class="json-textarea"
          :placeholder="inputPlaceholder"
          spellcheck="false"
        />
      </section>

      <section class="json-panel json-panel--result">
        <div class="json-panel__head">
          <div>
            <h3>结果工作区</h3>
            <p>桌面端同时展示结果文本与折叠视图，移动端可切换查看。</p>
          </div>
          <div class="json-panel__meta-group">
            <span class="json-panel__meta">{{ expandableNodeCount }} 个可展开节点</span>
            <div class="json-segmented-control">
              <button
                type="button"
                class="json-segmented-control__item"
                :class="{ 'is-active': activeResultView === 'text' }"
                @click="activeResultView = 'text'"
              >
                文本
              </button>
              <button
                type="button"
                class="json-segmented-control__item"
                :class="{ 'is-active': activeResultView === 'tree' }"
                @click="activeResultView = 'tree'"
              >
                折叠视图
              </button>
            </div>
          </div>
        </div>

        <div class="json-result-layout">
          <section class="json-result-card" :class="{ 'is-hidden-mobile': activeResultView !== 'text' }">
            <div class="json-result-card__head">
              <h4>结果文本</h4>
              <span>{{ hasResult ? '已同步' : parseError ? '错误态' : '等待解析' }}</span>
            </div>

            <pre v-if="hasResult" class="json-code"><code><span v-for="(token, index) in formattedTokens" :key="`${token.type}-${index}`" class="json-token" :class="`json-token--${token.type}`">{{ token.text }}</span></code></pre>

            <div v-else-if="parseError" class="json-error-card">
              <strong>JSON 解析失败</strong>
              <p>{{ parseError.message }}</p>
              <p v-if="parseError.position !== null">第 {{ parseError.line }} 行，第 {{ parseError.column }} 列</p>
              <div v-if="repairSuggestion" class="json-error-card__actions">
                <p>检测到可能存在 {{ repairSuggestion.repairCount }} 处双重转义引号，可直接尝试自动修复。</p>
                <button type="button" class="json-button" @click="handleRepairDoubleEscapedQuotes">自动修复双重转义</button>
              </div>
              <pre v-if="parseError.snippet" class="json-error-card__snippet"><code>{{ parseError.snippet }}</code></pre>
            </div>

            <p v-else class="json-empty-state">输入 JSON 后，这里会自动显示结果文本。</p>
          </section>

          <section class="json-result-card" :class="{ 'is-hidden-mobile': activeResultView !== 'tree' }">
            <div class="json-result-card__head">
              <h4>折叠视图</h4>
              <span>{{ rootExpandable ? '可折叠' : parsedValue !== null ? '基础值' : '未生成' }}</span>
            </div>

            <ul v-if="parsedValue !== null" class="json-tree-root">
              <JsonFormatterTreeNode
                :value="parsedValue"
                path="$"
                label="$"
                :depth="0"
                :expanded-paths="expandedPaths"
                :selected-path="selectedPath"
                @toggle="handleTogglePath"
                @select="handleSelectPath"
              />
            </ul>

            <p v-else class="json-empty-state">输入 JSON 并解析成功后，这里会展示可折叠的 JSON 结构视图。</p>
          </section>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.json-formatter-workbench {
  margin: 28px 0 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 18%, var(--vp-c-divider));
  border-radius: 28px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent), transparent 36%),
    linear-gradient(180deg, color-mix(in srgb, var(--vp-c-bg-soft) 92%, var(--vp-c-brand-1) 8%), var(--vp-c-bg-alt));
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
}

.json-formatter-workbench__header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.json-formatter-workbench__title {
  max-width: 42rem;
}

.json-formatter-workbench__eyebrow {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.json-formatter-workbench__title h2 {
  margin: 6px 0 8px;
  font-size: 1.9rem;
  line-height: 1.08;
}

.json-formatter-workbench__intro {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.json-formatter-workbench__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  align-content: flex-start;
}

.json-button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, var(--vp-c-brand-1) 6%);
  color: var(--vp-c-text-1);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.json-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 60%, var(--vp-c-divider));
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.json-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.json-button--brand {
  border-color: transparent;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
}

.json-formatter-workbench__statusbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--vp-c-bg) 96%, var(--vp-c-brand-1) 4%);
}

.json-formatter-workbench__statusbar p {
  flex: 1;
  margin: 0;
  min-width: 0;
}

.json-status-pill,
.json-path-pill,
.json-panel__meta {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 700;
}

.json-status-pill {
  text-transform: uppercase;
}

.json-path-pill,
.json-panel__meta {
  border: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg) 94%, var(--vp-c-brand-1) 6%);
}

.json-formatter-workbench__statusbar.is-success {
  border-color: color-mix(in srgb, #18a058 36%, var(--vp-c-divider));
  background: color-mix(in srgb, #18a058 10%, var(--vp-c-bg));
}

.json-formatter-workbench__statusbar.is-success .json-status-pill {
  background: color-mix(in srgb, #18a058 20%, white);
  color: #0f7a46;
}

.json-formatter-workbench__statusbar.is-danger {
  border-color: color-mix(in srgb, #dc2626 30%, var(--vp-c-divider));
  background: color-mix(in srgb, #dc2626 10%, var(--vp-c-bg));
}

.json-formatter-workbench__statusbar.is-danger .json-status-pill {
  background: color-mix(in srgb, #dc2626 18%, white);
  color: #b42318;
}

.json-formatter-workbench__statusbar.is-warning {
  border-color: color-mix(in srgb, #d97706 30%, var(--vp-c-divider));
  background: color-mix(in srgb, #d97706 10%, var(--vp-c-bg));
}

.json-formatter-workbench__statusbar.is-warning .json-status-pill {
  background: color-mix(in srgb, #d97706 18%, white);
  color: #b45309;
}

.json-formatter-workbench__statusbar.is-info .json-status-pill {
  background: color-mix(in srgb, var(--vp-c-brand-1) 16%, white);
  color: var(--vp-c-brand-1);
}

.json-formatter-workbench__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 1fr);
  gap: 16px;
}

.json-panel {
  min-width: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 24px;
  padding: 18px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, var(--vp-c-brand-1) 6%);
}

.json-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.json-panel__head h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}

.json-panel__head p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.json-panel__meta-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.json-textarea,
.json-code,
.json-error-card__snippet {
  width: 100%;
  box-sizing: border-box;
  border-radius: 20px;
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.92rem;
}

.json-textarea {
  min-height: 580px;
  border: 1px solid var(--vp-c-divider);
  padding: 18px;
  resize: vertical;
  background: color-mix(in srgb, var(--vp-c-bg) 98%, black 2%);
  color: var(--vp-c-text-1);
  line-height: 1.7;
}

.json-result-layout {
  display: grid;
  grid-template-rows: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
  min-width: 0;
  min-height: 580px;
}

.json-result-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  padding: 16px;
  background: color-mix(in srgb, var(--vp-c-bg) 97%, var(--vp-c-brand-1) 3%);
}

.json-result-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.json-result-card__head h4 {
  margin: 0;
  font-size: 0.98rem;
}

.json-result-card__head span {
  color: var(--vp-c-text-2);
  font-size: 0.84rem;
}

.json-code,
.json-error-card__snippet {
  flex: 1;
  min-height: 0;
  margin: 0;
  overflow: auto;
  border: 1px solid var(--vp-c-divider);
  padding: 16px;
  background: color-mix(in srgb, var(--vp-c-bg) 98%, black 2%);
  line-height: 1.65;
}

.json-token--whitespace,
.json-token--punctuation {
  color: var(--vp-c-text-1);
}

.json-token--key {
  color: #c678dd;
}

.json-token--string {
  color: #98c379;
}

.json-token--number {
  color: #d19a66;
}

.json-token--boolean {
  color: #61afef;
}

.json-token--null {
  color: #7f848e;
}

.json-empty-state {
  margin: auto 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.json-error-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.json-error-card strong,
.json-error-card p {
  margin: 0;
}

.json-error-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.json-error-card__actions p {
  color: var(--vp-c-text-2);
}

.json-error-card strong {
  color: #b42318;
}

.json-tree-root {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.json-segmented-control {
  display: none;
  gap: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 4px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, var(--vp-c-brand-1) 6%);
}

.json-segmented-control__item {
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.json-segmented-control__item.is-active {
  background: var(--vp-c-brand-1);
  color: white;
}

@media (max-width: 1080px) {
  .json-formatter-workbench__header {
    flex-direction: column;
  }

  .json-formatter-workbench__toolbar {
    justify-content: flex-start;
  }

  .json-formatter-workbench__grid {
    grid-template-columns: 1fr;
  }

  .json-textarea,
  .json-result-layout {
    min-height: 480px;
  }
}

@media (max-width: 860px) {
  .json-formatter-workbench {
    padding: 14px;
    border-radius: 20px;
  }

  .json-panel,
  .json-result-card {
    padding: 14px;
  }

  .json-formatter-workbench__statusbar {
    flex-wrap: wrap;
  }

  .json-panel__head,
  .json-result-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .json-panel__meta-group {
    width: 100%;
    align-items: flex-start;
  }

  .json-segmented-control {
    display: inline-flex;
  }

  .json-result-layout {
    display: block;
    min-height: 0;
  }

  .json-result-card + .json-result-card {
    margin-top: 14px;
  }

  .json-result-card.is-hidden-mobile {
    display: none;
  }
}
</style>