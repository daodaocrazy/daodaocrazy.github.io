<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'

import TravelRoutePreview from './TravelRoutePreview.vue'
import {
  collectTravelFilterOptions,
  filterTravelIndexEntries,
  formatTravelDateRange
} from '../../utils/travel-memory-view-model.mjs'
import { getTravelIndexEntries } from '../../utils/travel-memory-source.mjs'

const allEntries = getTravelIndexEntries()
const selectedRegion = ref('全部')
const selectedTags = ref([])

const filterOptions = computed(() => collectTravelFilterOptions(allEntries))
const regionOptions = computed(() => ['全部', ...filterOptions.value.regions])
const tagOptions = computed(() => filterOptions.value.tags)
const filteredEntries = computed(() => filterTravelIndexEntries(allEntries, {
  region: selectedRegion.value,
  tags: selectedTags.value
}))

const totalDays = computed(() => allEntries.reduce((sum, entry) => sum + entry.daysCount, 0))

function toggleTag(tag) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((item) => item !== tag)
    return
  }

  selectedTags.value = [...selectedTags.value, tag]
}

function clearTags() {
  selectedTags.value = []
}

function travelLink(slug) {
  return withBase(`/travel/_generated/${slug}`)
}

function coverStyle(coverImage) {
  return {
    backgroundImage: `linear-gradient(135deg, rgba(36, 27, 15, 0.1), rgba(36, 27, 15, 0.55)), url(${withBase(coverImage)})`
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
      </div>
      <dl class="travel-index-workbench__stats">
        <div>
          <dt>旅行数</dt>
          <dd>{{ allEntries.length }}</dd>
        </div>
        <div>
          <dt>总天数</dt>
          <dd>{{ totalDays }}</dd>
        </div>
        <div>
          <dt>已覆盖地区</dt>
          <dd>{{ filterOptions.regions.length }}</dd>
        </div>
      </dl>
    </header>

    <section class="travel-index-workbench__filters">
      <div class="travel-index-workbench__filter-block">
        <p>地区</p>
        <div class="travel-index-workbench__chips">
          <button
            v-for="region in regionOptions"
            :key="region"
            type="button"
            class="travel-chip"
            :class="{ 'is-active': selectedRegion === region }"
            @click="selectedRegion = region"
          >
            {{ region }}
          </button>
        </div>
      </div>

      <div class="travel-index-workbench__filter-block">
        <div class="travel-index-workbench__filter-header">
          <p>标签</p>
          <button v-if="selectedTags.length > 0" type="button" class="travel-index-workbench__clear" @click="clearTags">
            清空
          </button>
        </div>
        <div class="travel-index-workbench__chips">
          <button
            v-for="tag in tagOptions"
            :key="tag"
            type="button"
            class="travel-chip travel-chip--soft"
            :class="{ 'is-active': selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </section>

    <p class="travel-index-workbench__result">当前展示 {{ filteredEntries.length }} 条旅行记忆</p>

    <div v-if="filteredEntries.length > 0" class="travel-index-workbench__grid">
      <article v-for="entry in filteredEntries" :key="entry.slug" class="travel-card">
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

            <TravelRoutePreview :route-preview="entry.routePreview" />
          </div>
        </a>
      </article>
    </div>

    <div v-else class="travel-index-workbench__empty">
      <h2>当前筛选下还没有旅行</h2>
      <p>换一个地区或清空标签，就能回到完整旅行馆视图。</p>
    </div>
  </section>
</template>

<style scoped>
.travel-index-workbench {
  --travel-ink: #2c1d10;
  --travel-muted: #7f6956;
  --travel-sand: #f7ead8;
  --travel-cream: #fffaf1;
  --travel-line: rgba(89, 60, 37, 0.14);
  --travel-accent: #b5653f;
  --travel-accent-soft: rgba(181, 101, 63, 0.14);
  display: grid;
  gap: 28px;
  padding: 16px 0 12px;
}

.travel-index-workbench__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.8fr);
  gap: 22px;
  padding: 30px;
  border: 1px solid var(--travel-line);
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, rgba(181, 101, 63, 0.18), transparent 36%),
    linear-gradient(135deg, var(--travel-cream) 0%, #f3e2cb 100%);
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
  display: grid;
  gap: 12px;
  margin: 0;
}

.travel-index-workbench__stats div {
  padding: 16px 18px;
  border: 1px solid var(--travel-line);
  border-radius: 22px;
  background: rgba(255, 250, 241, 0.72);
}

.travel-index-workbench__stats dt {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--travel-muted);
}

.travel-index-workbench__stats dd {
  margin: 8px 0 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--travel-ink);
}

.travel-index-workbench__filters {
  display: grid;
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid var(--travel-line);
  border-radius: 26px;
  background: rgba(255, 250, 241, 0.82);
}

.travel-index-workbench__filter-block p {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--travel-ink);
}

.travel-index-workbench__filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.travel-index-workbench__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.travel-chip {
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #f0e2cf;
  color: var(--travel-ink);
  font: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.travel-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(181, 101, 63, 0.28);
}

.travel-chip.is-active {
  background: var(--travel-accent);
  color: #fff7ef;
}

.travel-chip--soft {
  background: rgba(181, 101, 63, 0.1);
}

.travel-index-workbench__clear {
  border: none;
  background: transparent;
  color: var(--travel-accent);
  font: inherit;
  cursor: pointer;
}

.travel-index-workbench__result {
  margin: 0;
  color: var(--travel-muted);
}

.travel-index-workbench__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.travel-card {
  overflow: hidden;
  border: 1px solid var(--travel-line);
  border-radius: 26px;
  background: var(--travel-cream);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.travel-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 36px rgba(44, 29, 16, 0.08);
}

.travel-card__link {
  display: grid;
  color: inherit;
  text-decoration: none;
}

.travel-card__cover {
  min-height: 168px;
  padding: 18px;
  background-color: #d5b18f;
  background-position: center;
  background-size: cover;
}

.travel-card__cover-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #fff8ef;
  font-weight: 600;
}

.travel-card__body {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.travel-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  font-size: 13px;
  color: var(--travel-muted);
}

.travel-card h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.18;
  color: var(--travel-ink);
}

.travel-card__summary {
  margin: 0;
  color: var(--travel-muted);
  line-height: 1.7;
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
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(181, 101, 63, 0.1);
  color: var(--travel-accent);
  font-size: 12px;
}

.travel-index-workbench__empty {
  padding: 42px 28px;
  border: 1px dashed var(--travel-line);
  border-radius: 26px;
  text-align: center;
  background: rgba(255, 250, 241, 0.72);
}

.travel-index-workbench__empty h2,
.travel-index-workbench__empty p {
  margin: 0;
}

.travel-index-workbench__empty p {
  margin-top: 10px;
  color: var(--travel-muted);
}

@media (max-width: 960px) {
  .travel-index-workbench__hero {
    grid-template-columns: 1fr;
  }
}
</style>