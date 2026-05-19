<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const snapshot = ref(null)
const status = ref('loading')
const errorMessage = ref('')
const snapshotUrl = withBase('/data/public-json-pilot.json')

const posts = computed(() => snapshot.value?.items ?? [])
const sourceLabel = computed(() => snapshot.value?.source ?? 'JSONPlaceholder /posts')
const itemCount = computed(() => snapshot.value?.itemCount ?? 0)
const fetchedAtLabel = computed(() => formatDateTime(snapshot.value?.fetchedAt))
const statusLabel = computed(() => {
  if (status.value === 'loading') {
    return '读取中'
  }

  if (status.value === 'error') {
    return '读取失败'
  }

  return '快照可用'
})

function formatDateTime(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '未知'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function validateSnapshot(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.items)) {
    throw new Error('站内静态快照格式无效。')
  }

  if (typeof value.source !== 'string' || typeof value.fetchedAt !== 'string') {
    throw new Error('站内静态快照缺少必要元数据。')
  }
}

async function loadSnapshot() {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    const response = await fetch(snapshotUrl, {
      headers: {
        accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`读取静态快照失败：${response.status} ${response.statusText}`)
    }

    const payload = await response.json()
    validateSnapshot(payload)
    snapshot.value = payload
    status.value = 'ready'
  } catch (error) {
    snapshot.value = null
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '读取静态快照失败。'
  }
}

onMounted(() => {
  loadSnapshot()
})
</script>

<template>
  <section class="public-json-pilot-workbench">
    <header class="public-json-pilot-workbench__hero">
      <div>
        <p class="public-json-pilot-workbench__eyebrow">Tool Box / Daily Snapshot</p>
        <h2>Public JSON Pilot</h2>
        <p class="public-json-pilot-workbench__intro">
          这个试点页面展示 GitHub Actions 抓取 JSONPlaceholder posts 后生成的站内静态结果，用来验证“公开源抓取 -> 静态快照 -> Pages 发布”的整条链路。
        </p>
      </div>

      <div class="public-json-pilot-workbench__actions">
        <button type="button" class="pilot-button pilot-button--primary" :disabled="status === 'loading'" @click="loadSnapshot">
          重新读取快照
        </button>
        <a class="pilot-button" :href="sourceLabel" target="_blank" rel="noreferrer">查看源接口</a>
      </div>
    </header>

    <section class="public-json-pilot-workbench__summary">
      <article class="pilot-summary-card">
        <span>当前状态</span>
        <strong>{{ statusLabel }}</strong>
      </article>
      <article class="pilot-summary-card">
        <span>数据源</span>
        <strong>{{ sourceLabel }}</strong>
      </article>
      <article class="pilot-summary-card">
        <span>最近抓取</span>
        <strong>{{ fetchedAtLabel }}</strong>
      </article>
      <article class="pilot-summary-card">
        <span>条目数量</span>
        <strong>{{ itemCount }}</strong>
      </article>
    </section>

    <p class="public-json-pilot-workbench__note">
      页面只读取最近一次构建时写入的静态 JSON，不会在浏览器里实时回源抓取。
    </p>

    <div v-if="status === 'loading'" class="pilot-status pilot-status--loading">
      正在读取站内静态快照…
    </div>

    <div v-else-if="status === 'error'" class="pilot-status pilot-status--error">
      {{ errorMessage }}
    </div>

    <div v-else class="public-json-pilot-workbench__list">
      <article v-for="item in posts" :key="item.id" class="pilot-post-card">
        <header class="pilot-post-card__meta">
          <span>Post #{{ item.id }}</span>
          <span>User {{ item.userId }}</span>
        </header>
        <h3>{{ item.title }}</h3>
        <p>{{ item.body }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.public-json-pilot-workbench {
  --pilot-border: rgba(15, 23, 42, 0.12);
  --pilot-surface: rgba(255, 255, 255, 0.92);
  --pilot-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--pilot-border);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), var(--pilot-surface));
  box-shadow: var(--pilot-shadow);
}

.public-json-pilot-workbench__hero {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.public-json-pilot-workbench__eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c2410c;
}

.public-json-pilot-workbench h2 {
  margin: 0;
  font-size: clamp(1.8rem, 2.8vw, 2.4rem);
}

.public-json-pilot-workbench__intro {
  max-width: 62ch;
  margin: 0.75rem 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.public-json-pilot-workbench__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pilot-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--vp-c-text-1);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.pilot-button:hover,
.pilot-button:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(194, 65, 12, 0.35);
}

.pilot-button:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
}

.pilot-button--primary {
  background: linear-gradient(135deg, #ea580c, #f97316);
  border-color: transparent;
  color: #fff;
}

.public-json-pilot-workbench__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.pilot-summary-card {
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.pilot-summary-card span {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.pilot-summary-card strong {
  display: block;
  word-break: break-word;
  font-size: 1rem;
}

.public-json-pilot-workbench__note {
  margin: 1rem 0 0;
  color: var(--vp-c-text-2);
}

.pilot-status {
  margin-top: 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  font-weight: 500;
}

.pilot-status--loading {
  background: rgba(14, 165, 233, 0.08);
  color: #075985;
}

.pilot-status--error {
  background: rgba(220, 38, 38, 0.08);
  color: #991b1b;
}

.public-json-pilot-workbench__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.pilot-post-card {
  padding: 1.15rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
}

.pilot-post-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pilot-post-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1.08rem;
  line-height: 1.45;
}

.pilot-post-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 960px) {
  .public-json-pilot-workbench__hero {
    flex-direction: column;
  }

  .public-json-pilot-workbench__actions {
    justify-content: flex-start;
  }

  .public-json-pilot-workbench__summary,
  .public-json-pilot-workbench__list {
    grid-template-columns: 1fr;
  }
}
</style>