<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

import {
  formatQuoteDelta,
  formatQuotePrice,
  getQuoteStatusLabel,
  getQuoteTone
} from '../utils/metals-market-view-model.mjs'

const snapshot = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const snapshotUrl = withBase('/data/metals-market-snapshot.json')

const metals = computed(() => snapshot.value?.items ?? [])

function formatTimestamp(value) {
  if (!value) {
    return '--'
  }

  return value.replace('T', ' ').replace('Z', ' UTC')
}

function formatTradeTime(quote) {
  return quote?.tradeDate ?? quote?.publishedAt ?? '--'
}

function quoteToneClass(quote) {
  return `is-${getQuoteTone(quote)}`
}

async function loadSnapshot() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(snapshotUrl)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    snapshot.value = await response.json()
  } catch (error) {
    snapshot.value = null
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSnapshot()
})
</script>

<template>
  <section class="metals-workbench">
    <header class="metals-workbench__hero">
      <div>
        <p class="metals-workbench__eyebrow">Tool Box</p>
        <h2>金属市场快照</h2>
        <p class="metals-workbench__intro">
          每日聚合六大有色与铁矿石的国内/国际双口径报价，当前版本只展示公开页面可获得的快照，不做汇率换算或跨市场合并价。
        </p>
      </div>

      <dl v-if="snapshot" class="metals-workbench__meta">
        <div>
          <dt>快照日期</dt>
          <dd>{{ snapshot.snapshotDate }}</dd>
        </div>
        <div>
          <dt>抓取时间</dt>
          <dd>{{ formatTimestamp(snapshot.snapshotAt) }}</dd>
        </div>
        <div>
          <dt>品种数量</dt>
          <dd>{{ snapshot.itemCount }}</dd>
        </div>
      </dl>
    </header>

    <div v-if="loading" class="metals-workbench__state is-loading">
      正在加载最新快照...
    </div>

    <div v-else-if="errorMessage" class="metals-workbench__state is-error">
      <p>暂时无法加载金属快照。</p>
      <p class="metals-workbench__state-detail">{{ errorMessage }}</p>
    </div>

    <div v-else class="metals-workbench__grid">
      <article v-for="metal in metals" :key="metal.metalKey" class="metals-workbench__metal-card">
        <header class="metals-workbench__metal-header">
          <div>
            <h3>{{ metal.metalLabel }}</h3>
            <p>{{ metal.metalKey }}</p>
          </div>
          <span class="metals-workbench__category">{{ metal.category === 'non_ferrous' ? '有色' : '黑色原料' }}</span>
        </header>

        <div class="metals-workbench__quotes">
          <section class="metals-workbench__quote" :class="quoteToneClass(metal.domesticQuote)">
            <div class="metals-workbench__quote-top">
              <strong>国内</strong>
              <span class="metals-workbench__status">{{ getQuoteStatusLabel(metal.domesticQuote) }}</span>
            </div>
            <p class="metals-workbench__basis">{{ metal.domesticQuote.basisLabel }}</p>
            <p class="metals-workbench__price">{{ formatQuotePrice(metal.domesticQuote) }}</p>
            <p class="metals-workbench__delta">{{ formatQuoteDelta(metal.domesticQuote) }}</p>
            <ul class="metals-workbench__details">
              <li>来源：<a :href="metal.domesticQuote.sourceUrl" target="_blank" rel="noreferrer">{{ metal.domesticQuote.sourceLabel }}</a></li>
              <li>口径：{{ metal.domesticQuote.specLabel }}</li>
              <li>时间：{{ formatTradeTime(metal.domesticQuote) }}</li>
            </ul>
            <p v-if="metal.domesticQuote.note" class="metals-workbench__note">{{ metal.domesticQuote.note }}</p>
          </section>

          <section class="metals-workbench__quote" :class="quoteToneClass(metal.internationalQuote)">
            <div class="metals-workbench__quote-top">
              <strong>国际</strong>
              <span class="metals-workbench__status">{{ getQuoteStatusLabel(metal.internationalQuote) }}</span>
            </div>
            <p class="metals-workbench__basis">{{ metal.internationalQuote.basisLabel }}</p>
            <p class="metals-workbench__price">{{ formatQuotePrice(metal.internationalQuote) }}</p>
            <p class="metals-workbench__delta">{{ formatQuoteDelta(metal.internationalQuote) }}</p>
            <ul class="metals-workbench__details">
              <li>来源：<a :href="metal.internationalQuote.sourceUrl" target="_blank" rel="noreferrer">{{ metal.internationalQuote.sourceLabel }}</a></li>
              <li>口径：{{ metal.internationalQuote.specLabel }}</li>
              <li>时间：{{ formatTradeTime(metal.internationalQuote) }}</li>
            </ul>
            <p v-if="metal.internationalQuote.basisReferenceLabel" class="metals-workbench__note">
              口径锚点：<a :href="metal.internationalQuote.basisReferenceUrl" target="_blank" rel="noreferrer">{{ metal.internationalQuote.basisReferenceLabel }}</a>
            </p>
            <p v-if="metal.internationalQuote.note" class="metals-workbench__note">{{ metal.internationalQuote.note }}</p>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.metals-workbench {
  --metals-shell-start: color-mix(in srgb, var(--vp-c-bg) 86%, var(--vp-c-brand-1) 14%);
  --metals-shell-end: color-mix(in srgb, var(--vp-c-bg-alt) 90%, var(--vp-c-brand-2) 10%);
  --metals-panel: color-mix(in srgb, var(--vp-c-bg-elv) 94%, var(--vp-c-brand-1) 6%);
  --metals-panel-strong: color-mix(in srgb, var(--vp-c-bg-elv) 88%, var(--vp-c-brand-1) 12%);
  --metals-panel-soft: color-mix(in srgb, var(--vp-c-bg) 92%, var(--vp-c-brand-1) 8%);
  --metals-border: color-mix(in srgb, var(--vp-c-divider) 78%, var(--vp-c-brand-1) 22%);
  --metals-border-strong: color-mix(in srgb, var(--vp-c-divider) 62%, var(--vp-c-brand-1) 38%);
  --metals-accent: var(--vp-c-brand-1);
  --metals-accent-soft: color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
  --metals-text: var(--vp-c-text-1);
  --metals-text-soft: var(--vp-c-text-2);
  --metals-text-muted: var(--vp-c-text-3);
  margin: 28px 0 12px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid var(--metals-border-strong);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--vp-c-brand-2) 18%, transparent), transparent 32%),
    linear-gradient(145deg, var(--metals-shell-start), var(--metals-shell-end));
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
  color: var(--metals-text);
}

.metals-workbench__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.metals-workbench__hero > div {
  max-width: 42rem;
}

.metals-workbench__eyebrow {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--metals-accent);
}

.metals-workbench__hero h2 {
  margin: 6px 0 8px;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  line-height: 1.08;
}

.metals-workbench__intro {
  margin: 0;
  color: var(--metals-text-soft);
  line-height: 1.7;
}

.metals-workbench__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(7rem, 1fr));
  gap: 12px;
  min-width: min(24rem, 100%);
}

.metals-workbench__meta div,
.metals-workbench__quote {
  border: 1px solid var(--metals-border);
  background: var(--metals-panel);
  border-radius: 18px;
}

.metals-workbench__meta div {
  padding: 14px 16px;
}

.metals-workbench__meta dt {
  font-size: 0.78rem;
  color: var(--metals-text-muted);
}

.metals-workbench__meta dd {
  margin: 0.45rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.metals-workbench__state {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--metals-border);
  background: var(--metals-panel-soft);
}

.metals-workbench__state.is-loading {
  background: var(--metals-panel-soft);
}

.metals-workbench__state.is-error {
  background: color-mix(in srgb, var(--vp-c-red-1) 10%, var(--metals-panel-soft) 90%);
  border-color: color-mix(in srgb, var(--vp-c-red-1) 30%, var(--metals-border) 70%);
}

.metals-workbench__state-detail {
  margin-bottom: 0;
  color: var(--vp-c-red-1);
}

.metals-workbench__grid {
  display: grid;
  gap: 16px;
}

.metals-workbench__metal-card {
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--metals-border);
  background: var(--metals-panel-strong);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vp-c-default-1) 4%, transparent);
}

.metals-workbench__metal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.metals-workbench__metal-header h3,
.metals-workbench__metal-header p {
  margin: 0;
}

.metals-workbench__metal-header h3 {
  font-size: 1.08rem;
}

.metals-workbench__metal-header p {
  color: var(--metals-text-muted);
  font-size: 0.92rem;
}

.metals-workbench__category {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--metals-accent-soft);
  color: var(--metals-accent);
  font-size: 0.78rem;
}

.metals-workbench__quotes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metals-workbench__quote {
  padding: 16px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vp-c-default-1) 4%, transparent);
}

.metals-workbench__quote.is-positive {
  border-color: color-mix(in srgb, var(--vp-c-green-1) 44%, var(--metals-border) 56%);
  background: color-mix(in srgb, var(--vp-c-green-1) 8%, var(--metals-panel) 92%);
}

.metals-workbench__quote.is-negative {
  border-color: color-mix(in srgb, var(--vp-c-red-1) 44%, var(--metals-border) 56%);
  background: color-mix(in srgb, var(--vp-c-red-1) 8%, var(--metals-panel) 92%);
}

.metals-workbench__quote.is-warning {
  border-color: color-mix(in srgb, var(--vp-c-yellow-1) 44%, var(--metals-border) 56%);
  background: color-mix(in srgb, var(--vp-c-yellow-1) 8%, var(--metals-panel) 92%);
}

.metals-workbench__quote.is-muted {
  border-color: var(--metals-border);
}

.metals-workbench__quote-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.metals-workbench__status {
  font-size: 0.78rem;
  color: var(--metals-text-muted);
}

.metals-workbench__basis {
  font-size: 0.92rem;
  color: var(--metals-text-soft);
}

.metals-workbench__basis,
.metals-workbench__delta,
.metals-workbench__note {
  margin: 0.55rem 0 0;
}

.metals-workbench__price {
  margin: 0.75rem 0 0;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
}

.metals-workbench__delta {
  font-weight: 600;
}

.metals-workbench__quote.is-positive .metals-workbench__delta {
  color: var(--vp-c-green-1);
}

.metals-workbench__quote.is-negative .metals-workbench__delta {
  color: var(--vp-c-red-1);
}

.metals-workbench__quote.is-warning .metals-workbench__delta {
  color: var(--vp-c-yellow-1);
}

.metals-workbench__quote.is-muted .metals-workbench__delta {
  color: var(--metals-text-soft);
}

.metals-workbench__details {
  margin: 0.75rem 0 0;
  padding-left: 1.1rem;
  color: var(--metals-text-soft);
}

.metals-workbench__details li + li {
  margin-top: 0.35rem;
}

.metals-workbench a {
  color: var(--metals-accent);
  text-decoration-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent);
}

.metals-workbench a:hover {
  color: var(--vp-c-brand-2);
}

@media (max-width: 960px) {
  .metals-workbench__hero,
  .metals-workbench__quotes {
    grid-template-columns: 1fr;
    display: grid;
  }

  .metals-workbench__meta {
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .metals-workbench {
    margin: 24px 0 12px;
    padding: 18px;
    border-radius: 22px;
  }

  .metals-workbench__meta {
    grid-template-columns: 1fr;
  }
}
</style>