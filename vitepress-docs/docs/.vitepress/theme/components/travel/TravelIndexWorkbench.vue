<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'

import TravelRoutePreview from './TravelRoutePreview.vue'
import { formatTravelDateRange } from '../../utils/travel-memory-view-model.mjs'
import { getTravelIndexEntries } from '../../utils/travel-memory-source.mjs'

const allEntries = getTravelIndexEntries()
const totalDays = computed(() => allEntries.reduce((sum, entry) => sum + entry.daysCount, 0))
const regionsCount = computed(() => new Set(allEntries.map((entry) => entry.region)).size)

function travelLink(slug) {
  return withBase(`/travel/_generated/${slug}`)
}

function coverStyle(coverImage) {
  return {
    backgroundColor: 'var(--travel-card-cover-base)',
    backgroundImage: `linear-gradient(135deg, var(--travel-cover-overlay-start), var(--travel-cover-overlay-end)), url(${withBase(coverImage)})`
  }
}
</script>

<template>
  <section class="travel-index-workbench">
    <header class="travel-index-workbench__hero">
      <div class="travel-index-workbench__hero-copy">
        <p class="travel-index-workbench__eyebrow">Travel Memory Atlas</p>
        <h1>旅行地图馆</h1>
        <p class="travel-index-workbench__intro">
          把每次定稿后的路线、站点和当天节奏都固定下来。这里不是攻略合集，而是能按地图回放的个人旅行记忆库。
        </p>
        <p class="travel-index-workbench__stats">
          {{ allEntries.length }} 条旅行记忆 · {{ totalDays }} 天 · {{ regionsCount }} 个地区
        </p>
      </div>
    </header>

    <p class="travel-index-workbench__result">共 {{ allEntries.length }} 条旅行记忆</p>

    <div v-if="allEntries.length > 0" class="travel-index-workbench__grid">
      <article v-for="entry in allEntries" :key="entry.slug" class="travel-card">
        <a :href="travelLink(entry.slug)" class="travel-card__link">
          <div class="travel-card__cover" :style="coverStyle(entry.coverImage)">
            <div class="travel-card__cover-meta">
              <span>{{ entry.region }}</span>
              <span>{{ entry.daysCount }} 天</span>
            </div>
          </div>

          <div class="travel-card__body">
            <div class="travel-card__meta">
              <span>{{ formatTravelDateRange(entry.startDate, entry.endDate) }}</span>
              <span>{{ entry.places.join(' · ') }}</span>
            </div>
            <h2>{{ entry.title }}</h2>
            <p class="travel-card__summary">{{ entry.summary }}</p>

            <ul class="travel-card__tags">
              <li v-for="tag in entry.tags" :key="tag">{{ tag }}</li>
            </ul>

            <div class="travel-card__preview">
              <TravelRoutePreview :route-preview="entry.routePreview" :width="280" :height="108" />
            </div>
          </div>
        </a>
      </article>
    </div>

    <div v-else class="travel-index-workbench__empty">
      <h2>还没有旅行记录</h2>
      <p>后续新增旅行后，这里会自动显示对应的记忆卡片。</p>
    </div>
  </section>
</template>

<style scoped>
.travel-index-workbench {
  display: grid;
  gap: 28px;
  padding: 16px 0 12px;
  color: var(--travel-ink);
}

.travel-index-workbench__hero {
  display: block;
  padding: 30px;
  border: 1px solid var(--travel-line);
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--travel-accent) 20%, transparent), transparent 36%),
    linear-gradient(135deg, var(--travel-hero-start) 0%, var(--travel-hero-end) 100%);
}

.travel-index-workbench__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-index-workbench__hero h1 {
  margin: 0;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.02;
  color: var(--travel-ink);
}

.travel-index-workbench__intro {
  max-width: 58ch;
  margin: 14px 0 0;
  font-size: 16px;
  line-height: 1.75;
  color: var(--travel-muted);
}

.travel-index-workbench__stats {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--travel-muted);
}

.travel-index-workbench__result {
  margin: 0;
  color: var(--travel-muted);
}

.travel-index-workbench__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 320px));
  justify-content: start;
  gap: 20px;
}

.travel-card {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--travel-line);
  border-radius: 26px;
  background: var(--travel-surface-elevated);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.travel-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--travel-shadow);
}

.travel-card__link {
  display: grid;
  width: 100%;
  color: inherit;
  text-decoration: none;
}

.travel-card__cover {
  min-height: 116px;
  padding: 14px;
  background-color: var(--travel-card-cover-base);
  background-position: center;
  background-size: cover;
}

.travel-card__cover-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--travel-cover-text);
  font-size: 12px;
  font-weight: 600;
}

.travel-card__body {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.travel-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 12px;
  color: var(--travel-muted);
}

.travel-card h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.22;
  color: var(--travel-ink);
}

.travel-card__summary {
  margin: 0;
  color: var(--travel-muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.travel-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.travel-card__tags li {
  padding: 5px 9px;
  border-radius: 999px;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 11px;
}

.travel-card__preview {
  margin-top: 2px;
  border: 1px solid var(--travel-line);
  border-radius: 22px;
  overflow: hidden;
}

.travel-index-workbench__empty {
  padding: 42px 28px;
  border: 1px dashed var(--travel-line);
  border-radius: 26px;
  text-align: center;
  background: var(--travel-surface);
}

.travel-index-workbench__empty h2,
.travel-index-workbench__empty p {
  margin: 0;
}

.travel-index-workbench__empty p {
  margin-top: 10px;
  color: var(--travel-muted);
}

</style>