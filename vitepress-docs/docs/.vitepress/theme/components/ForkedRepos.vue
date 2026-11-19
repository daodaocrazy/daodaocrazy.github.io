<script setup>
import { computed, ref } from 'vue'

import snapshot from '../../../.data/forked-repos.json'

// 默认只铺 6 张，剩下的折起来。49 张全铺会在首页堆出二十多行。
const DEFAULT_VISIBLE = 6

const expanded = ref(false)

const repos = computed(() => Array.isArray(snapshot.repos) ? snapshot.repos : [])
const total = computed(() => repos.value.length)
const visibleRepos = computed(() => (expanded.value ? repos.value : repos.value.slice(0, DEFAULT_VISIBLE)))
const hiddenCount = computed(() => Math.max(total.value - DEFAULT_VISIBLE, 0))

const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Scala: '#c22d40',
  Go: '#00ADD8',
  Rust: '#dea584',
  Shell: '#89e051',
  C: '#8c8c8c',
  'C++': '#f34b7d',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c'
}

function languageColor(language) {
  return languageColors[language] ?? 'var(--vp-c-text-3)'
}

function monogram(name) {
  const first = [...String(name)].find((char) => /[\p{L}\p{N}]/u.test(char))
  return first ? first.toUpperCase() : '#'
}

function formatDate(value) {
  if (typeof value !== 'string') {
    return null
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}.${month}.${day}`
}

const snapshotDate = computed(() => formatDate(snapshot.generatedAt))
</script>

<template>
  <section class="forks">
    <div class="forks__inner">
      <header class="forks__header">
        <div>
          <h2 class="forks__title">Forks</h2>
          <p class="forks__subtitle">近期关注与学习中的仓库，按最近同步时间排序</p>
        </div>
        <p v-if="total > 0" class="forks__count">{{ total }} 个</p>
      </header>

      <div v-if="total > 0" class="forks__grid">
        <a
          v-for="repo in visibleRepos"
          :key="repo.url"
          class="fork-card"
          :href="repo.url"
          target="_blank"
          rel="noopener"
        >
          <span class="fork-card__monogram" aria-hidden="true">{{ monogram(repo.name) }}</span>

          <div class="fork-card__body">
            <div class="fork-card__top">
              <h3 class="fork-card__name">{{ repo.name }}</h3>
              <span v-if="formatDate(repo.updatedAt)" class="fork-card__date">{{ formatDate(repo.updatedAt) }}</span>
            </div>

            <p v-if="repo.description" class="fork-card__description">{{ repo.description }}</p>
            <p v-else class="fork-card__description fork-card__description--empty">作者未填写描述</p>

            <div v-if="repo.language || repo.stars > 0 || repo.forks > 0" class="fork-card__meta">
              <span v-if="repo.language" class="fork-card__language">
                <span class="fork-card__dot" :style="{ background: languageColor(repo.language) }" />
                {{ repo.language }}
              </span>
              <span v-if="repo.stars > 0" class="fork-card__stat">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .75l2.2 4.46 4.92.72-3.56 3.47.84 4.9L8 12.03l-4.4 2.27.84-4.9L.88 5.93l4.92-.72z" /></svg>
                {{ repo.stars }}
              </span>
              <span v-if="repo.forks > 0" class="fork-card__stat">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0-1.5a3 3 0 0 1 1 5.83V7a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.17a3 3 0 1 1 0 0V7a2.5 2.5 0 0 1-2.5 2.5H7v.17a3 3 0 1 1-1 0V9.5H5A2.5 2.5 0 0 1 2.5 7v-.17a3 3 0 1 1 1 0V7a1 1 0 0 0 1 1h1.5z" /></svg>
                {{ repo.forks }}
              </span>
            </div>
          </div>
        </a>
      </div>

      <p v-else class="forks__empty">暂时读不到 fork 列表。</p>

      <div v-if="total > DEFAULT_VISIBLE" class="forks__footer">
        <button type="button" class="forks__toggle" @click="expanded = !expanded">
          <span>{{ expanded ? '收起' : `展开全部 ${total} 个` }}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ 'is-flipped': expanded }">
            <path d="M3.5 6L8 10.5 12.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <p v-if="!expanded && hiddenCount > 0" class="forks__more">还有 {{ hiddenCount }} 个未显示</p>
      </div>

      <p v-if="snapshotDate" class="forks__stamp">列表快照 {{ snapshotDate }}</p>
    </div>
  </section>
</template>

<style scoped>
.forks {
  padding: 56px 24px 0;
}

/* 与上方 VPFeatures 用同一套容器尺寸，否则左侧边线会差 24px。 */
.forks__inner {
  max-width: 1152px;
  margin: 0 auto;
}

.forks__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.forks__title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.forks__subtitle {
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.forks__count {
  flex: none;
  margin: 0 0 2px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.82rem;
  font-weight: 600;
}

.forks__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.fork-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.fork-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 10px 26px rgba(60, 135, 114, 0.14);
}

.fork-card__monogram {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.fork-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.fork-card__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.fork-card__name {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}

.fork-card:hover .fork-card__name {
  color: var(--vp-c-brand-1);
}

.fork-card__date {
  flex: none;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
}

.fork-card__description {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fork-card__description--empty {
  color: var(--vp-c-text-3);
  font-style: italic;
}

.fork-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 2px;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.fork-card__language,
.fork-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.fork-card__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.fork-card__stat svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

.forks__empty {
  margin: 24px 0 0;
  padding: 32px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 16px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.forks__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}

.forks__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
}

.forks__toggle:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.forks__toggle svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.forks__toggle svg.is-flipped {
  transform: rotate(180deg);
}

.forks__more,
.forks__stamp {
  margin: 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.forks__stamp {
  margin-top: 18px;
  text-align: center;
}

@media (max-width: 768px) {
  .forks {
    padding: 40px 20px 0;
  }

  .forks__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .forks__grid {
    grid-template-columns: 1fr;
  }

  .fork-card {
    padding: 16px;
  }

  .forks__footer {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
