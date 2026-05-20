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
  margin-top: 2rem;
  padding: 1.25rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(197, 136, 71, 0.16), transparent 32%),
    linear-gradient(145deg, rgba(12, 23, 36, 0.96), rgba(28, 42, 61, 0.92));
  color: #eef4fb;
}

.metals-workbench__hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.metals-workbench__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f2c27d;
}

.metals-workbench__hero h2 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.metals-workbench__intro {
  max-width: 52rem;
  margin: 0.75rem 0 0;
  color: rgba(238, 244, 251, 0.84);
  line-height: 1.7;
}

.metals-workbench__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(7rem, 1fr));
  gap: 0.9rem;
  min-width: min(24rem, 100%);
}

.metals-workbench__meta div,
.metals-workbench__quote {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 18px;
}

.metals-workbench__meta div {
  padding: 0.9rem 1rem;
}

.metals-workbench__meta dt {
  font-size: 0.78rem;
  color: rgba(238, 244, 251, 0.66);
}

.metals-workbench__meta dd {
  margin: 0.45rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.metals-workbench__state {
  padding: 1rem 1.1rem;
  border-radius: 18px;
}

.metals-workbench__state.is-loading {
  background: rgba(255, 255, 255, 0.08);
}

.metals-workbench__state.is-error {
  background: rgba(138, 35, 49, 0.26);
  border: 1px solid rgba(255, 137, 137, 0.34);
}

.metals-workbench__state-detail {
  margin-bottom: 0;
  color: rgba(255, 226, 226, 0.9);
}

.metals-workbench__grid {
  display: grid;
  gap: 1rem;
}

.metals-workbench__metal-card {
  padding: 1.1rem;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
}

.metals-workbench__metal-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.metals-workbench__metal-header h3,
.metals-workbench__metal-header p {
  margin: 0;
}

.metals-workbench__metal-header p {
  color: rgba(238, 244, 251, 0.56);
}

.metals-workbench__category {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(242, 194, 125, 0.16);
  color: #f7d2a5;
  font-size: 0.78rem;
}

.metals-workbench__quotes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.metals-workbench__quote {
  padding: 1rem;
}

.metals-workbench__quote.is-positive {
  border-color: rgba(95, 215, 150, 0.35);
}

.metals-workbench__quote.is-negative {
  border-color: rgba(245, 120, 120, 0.35);
}

.metals-workbench__quote.is-warning {
  border-color: rgba(247, 204, 115, 0.35);
}

.metals-workbench__quote.is-muted {
  border-color: rgba(255, 255, 255, 0.08);
}

.metals-workbench__quote-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.metals-workbench__status {
  font-size: 0.78rem;
  color: rgba(238, 244, 251, 0.68);
}

.metals-workbench__basis,
.metals-workbench__delta,
.metals-workbench__note {
  margin: 0.55rem 0 0;
}

.metals-workbench__price {
  margin: 0.75rem 0 0;
  font-size: 1.32rem;
  font-weight: 700;
}

.metals-workbench__details {
  margin: 0.75rem 0 0;
  padding-left: 1.1rem;
  color: rgba(238, 244, 251, 0.8);
}

.metals-workbench__details li + li {
  margin-top: 0.35rem;
}

.metals-workbench a {
  color: #f2c27d;
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
    padding: 1rem;
    border-radius: 22px;
  }

  .metals-workbench__meta {
    grid-template-columns: 1fr;
  }
}
</style>