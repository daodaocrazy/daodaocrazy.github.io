<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'

import TravelRoutePreview from './TravelRoutePreview.vue'
import {
  collectTravelFilterOptions,
  filterTravelIndexEntries,
  formatTravelDateRange,
  formatTravelDistance
} from '../../utils/travel-memory-view-model.mjs'
import { getTravelIndexEntries } from '../../utils/travel-memory-source.mjs'

const allEntries = getTravelIndexEntries()

const activeRegion = ref('全部')
const activeTags = ref([])

const filterOptions = computed(() => collectTravelFilterOptions(allEntries))
const filteredEntries = computed(() => filterTravelIndexEntries(allEntries, {
  region: activeRegion.value,
  tags: activeTags.value
}))

const totalDays = computed(() => allEntries.reduce((sum, entry) => sum + entry.daysCount, 0))
const regionsCount = computed(() => new Set(allEntries.map((entry) => entry.region)).size)
const hasActiveFilter = computed(() => activeRegion.value !== '全部' || activeTags.value.length > 0)

function toggleTag(tag) {
  activeTags.value = activeTags.value.includes(tag)
    ? activeTags.value.filter((item) => item !== tag)
    : [...activeTags.value, tag]
}

function resetFilters() {
  activeRegion.value = '全部'
  activeTags.value = []
}

function travelLink(slug) {
  return withBase(`/travel/_generated/${slug}`)
}

function cardLink(entry) {
  if (entry.isTool && entry.externalLink) {
    return withBase(entry.externalLink)
  }

  return travelLink(entry.slug)
}

function isExternalCard(entry) {
  return !!(entry.isTool && entry.externalLink)
}

function coverStyle(coverImage) {
  return {
    backgroundColor: 'var(--travel-card-cover-base)',
    backgroundImage: `linear-gradient(135deg, var(--travel-cover-overlay-start), var(--travel-cover-overlay-end)), url(${withBase(coverImage)})`
  }
}

function tripDistanceLabel(entry) {
  const distance = entry.totalDistanceMeters

  if (!Number.isFinite(distance) || distance <= 0) {
    return null
  }

  return formatTravelDistance(distance)
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
      </div>

      <dl class="travel-index-workbench__stats">
        <div>
          <dt>旅行记忆</dt>
          <dd>{{ allEntries.length }} 条</dd>
        </div>
        <div>
          <dt>累计天数</dt>
          <dd>{{ totalDays }} 天</dd>
        </div>
        <div>
          <dt>覆盖地区</dt>
          <dd>{{ regionsCount }} 个</dd>
        </div>
      </dl>
    </header>

    <div class="travel-index-workbench__filters">
      <div class="travel-index-workbench__filter-row">
        <p class="travel-index-workbench__filter-label">地区</p>
        <div class="travel-index-workbench__chips">
          <button
            type="button"
            class="travel-chip"
            :class="{ 'is-active': activeRegion === '全部' }"
            @click="activeRegion = '全部'"
          >
            全部
          </button>
          <button
            v-for="region in filterOptions.regions"
            :key="region"
            type="button"
            class="travel-chip"
            :class="{ 'is-active': activeRegion === region }"
            @click="activeRegion = region"
          >
            {{ region }}
          </button>
        </div>
      </div>

      <div class="travel-index-workbench__filter-row">
        <p class="travel-index-workbench__filter-label">标签</p>
        <div class="travel-index-workbench__chips">
          <button
            v-for="tag in filterOptions.tags"
            :key="tag"
            type="button"
            class="travel-chip"
            :class="{ 'is-active': activeTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <div class="travel-index-workbench__filter-footer">
        <p class="travel-index-workbench__result">
          显示 {{ filteredEntries.length }} / {{ allEntries.length }} 条
        </p>
        <button v-if="hasActiveFilter" type="button" class="travel-chip travel-chip--ghost" @click="resetFilters">
          清除筛选
        </button>
      </div>
    </div>

    <div v-if="filteredEntries.length > 0" class="travel-index-workbench__grid">
      <article
        v-for="entry in filteredEntries"
        :key="entry.slug"
        class="travel-card"
        :class="{ 'travel-card--tool': entry.isTool }"
      >
        <a
          :href="cardLink(entry)"
          class="travel-card__link"
          :target="isExternalCard(entry) ? '_blank' : undefined"
          :rel="isExternalCard(entry) ? 'noopener' : undefined"
        >
          <div class="travel-card__cover" :style="coverStyle(entry.coverImage)">
            <span class="travel-card__cover-region">{{ entry.region }}</span>
          </div>

          <div class="travel-card__body">
            <div class="travel-card__meta">
              <template v-if="entry.daysCount > 0">
                <span>{{ formatTravelDateRange(entry.startDate, entry.endDate) }}</span>
                <span>{{ entry.daysCount }} 天</span>
                <span v-if="tripDistanceLabel(entry)">{{ tripDistanceLabel(entry) }}</span>
              </template>
              <template v-else>
                <span>永久可用</span>
              </template>
            </div>

            <h2>{{ entry.title }}</h2>
            <p class="travel-card__summary">{{ entry.summary }}</p>

            <p v-if="entry.places && entry.places.length > 0" class="travel-card__places">
              {{ entry.places.join(' · ') }}
            </p>
            <p v-else-if="entry.isTool" class="travel-card__places">JSON · 文本导入 · 地理编码</p>

            <div v-if="entry.routePreview" class="travel-card__preview">
              <TravelRoutePreview :route-preview="entry.routePreview" :width="320" :height="140" />
            </div>

            <ul class="travel-card__tags">
              <li v-for="tag in entry.tags" :key="tag">{{ tag }}</li>
            </ul>
          </div>
        </a>
      </article>
    </div>

    <div v-else class="travel-index-workbench__empty">
      <h2>没有符合条件的旅行记忆</h2>
      <p>换一个地区或标签组合，或者清除当前筛选。</p>
      <button type="button" class="travel-chip travel-chip--ghost" @click="resetFilters">清除筛选</button>
    </div>
  </section>
</template>

<style scoped>
.travel-index-workbench {
  display: grid;
  gap: 22px;
  padding: 8px 0 12px;
  color: var(--travel-ink);
}

.travel-index-workbench__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 28px;
  align-items: end;
  padding: 32px 34px;
  border: 1px solid var(--travel-line);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--travel-accent) 20%, transparent), transparent 44%),
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
  font-size: clamp(32px, 3.6vw, 46px);
  line-height: 1.05;
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
}

.travel-index-workbench__stats dt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--travel-soft);
}

.travel-index-workbench__stats dd {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--travel-ink);
}

.travel-index-workbench__filters {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid var(--travel-line);
  border-radius: 20px;
  background: var(--travel-surface);
}

.travel-index-workbench__filter-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.travel-index-workbench__filter-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--travel-soft);
}

.travel-index-workbench__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.travel-index-workbench__filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--travel-line);
}

.travel-index-workbench__result {
  margin: 0;
  font-size: 13px;
  color: var(--travel-muted);
}

.travel-index-workbench__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.travel-card {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--travel-line);
  border-radius: 24px;
  background: var(--travel-surface-elevated);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.travel-card:hover {
  transform: translateY(-3px);
  border-color: var(--travel-line-strong);
  box-shadow: var(--travel-shadow);
}

.travel-card--tool {
  border-style: dashed;
}

.travel-card__link {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: inherit;
  text-decoration: none;
}

.travel-card__cover {
  position: relative;
  min-height: 148px;
  background-color: var(--travel-card-cover-base);
  background-position: center;
  background-size: cover;
}

.travel-card__cover-region {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.42);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.96);
  font-size: 12px;
  font-weight: 600;
}

.travel-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px 20px;
}

.travel-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--travel-muted);
}

.travel-card__meta span + span::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 3px;
  margin-right: 10px;
  border-radius: 50%;
  background: var(--travel-soft);
  vertical-align: middle;
}

.travel-card h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.25;
  color: var(--travel-ink);
}

.travel-card__summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--travel-muted);
}

.travel-card__places {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--travel-soft);
}

.travel-card__preview {
  margin-top: 4px;
  border-radius: 18px;
  overflow: hidden;
}

.travel-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.travel-card__tags li {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 11px;
  font-weight: 600;
}

.travel-index-workbench__empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 46px 28px;
  border: 1px dashed var(--travel-line);
  border-radius: 24px;
  text-align: center;
  background: var(--travel-surface);
}

.travel-index-workbench__empty h2,
.travel-index-workbench__empty p {
  margin: 0;
}

.travel-index-workbench__empty p {
  color: var(--travel-muted);
}

@media (max-width: 900px) {
  .travel-index-workbench__hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .travel-index-workbench__hero {
    padding: 24px 20px;
  }

  .travel-index-workbench__filter-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .travel-index-workbench__grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.travel-chip {
  padding: 7px 13px;
  border: 1px solid var(--travel-line);
  border-radius: 999px;
  background: var(--travel-surface-elevated);
  color: var(--travel-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.travel-chip:hover {
  border-color: var(--travel-line-strong);
  color: var(--travel-ink);
}

.travel-chip.is-active {
  border-color: var(--travel-line-strong);
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
}

.travel-chip--ghost {
  background: transparent;
  color: var(--travel-accent);
  border-color: var(--travel-line-strong);
}
</style>
