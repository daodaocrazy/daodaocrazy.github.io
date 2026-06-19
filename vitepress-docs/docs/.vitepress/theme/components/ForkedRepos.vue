<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Repository {
  name: string
  description: string
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
}

const repos = ref<Repository[]>([])
const loading = ref(true)
const error = ref('')

const GITHUB_USERNAME = 'daodaocrazy'
const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Scala: '#c22d40',
  Go: '#00ADD8',
  Rust: '#dea584',
  Shell: '#89e051',
  C: '#555555',
  'C++': '#f34b7d',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dockerfile: '#384d54',
  Makefile: '#427819'
}

const visibleRepos = computed<Repository[]>(() => {
  return repos.value
    .filter((repo) => repo.fork)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
})

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const getLanguageColor = (language: string | null): string => {
  if (!language) return 'var(--vp-c-text-3)'
  return LANGUAGE_COLORS[language] || 'var(--vp-c-text-3)'
}

const fetchRepos = async () => {
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch repositories')
    }
    const data = await response.json()
    repos.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load repositories'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRepos()
})
</script>

<template>
  <div class="forked-repos">
    <h2 class="forked-repos-title">🍴 Forks</h2>
    <p class="forked-repos-subtitle">近期关注与学习中的仓库 · 按更新时间排序</p>

    <div v-if="loading" class="state-panel">
      <div class="spinner" />
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="state-panel">
      <span>⚠️ {{ error }}</span>
    </div>

    <div v-else-if="visibleRepos.length === 0" class="state-panel">
      <span>暂无 fork</span>
    </div>

    <div v-else class="repo-grid">
      <a
        v-for="repo in visibleRepos"
        :key="repo.html_url"
        :href="repo.html_url"
        target="_blank"
        rel="noopener"
        class="repo-card"
      >
        <div class="repo-card-header">
          <span class="repo-card-name">📂 {{ repo.name }}</span>
        </div>

        <p class="repo-card-description">
          {{ repo.description || '暂无描述' }}
        </p>

        <div class="repo-card-meta">
          <span v-if="repo.language" class="repo-meta-item">
            <span class="lang-dot" :style="{ background: getLanguageColor(repo.language) }" />
            <span>{{ repo.language }}</span>
          </span>
          <span class="repo-meta-item">⭐ {{ repo.stargazers_count }}</span>
          <span class="repo-meta-item">🔀 {{ repo.forks_count }}</span>
          <span class="repo-meta-item repo-updated">更新于 {{ formatDate(repo.updated_at) }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.forked-repos {
  margin-top: 3rem;
  padding-top: 2.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.forked-repos-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 0.5rem;
  letter-spacing: -0.01em;
}

.forked-repos-subtitle {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin: 0 0 2rem;
}

.state-panel {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.repo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.repo-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s, background-color 0.25s, transform 0.25s;
  min-height: 140px;
}

.repo-card:hover {
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-soft-up);
  transform: translateY(-2px);
}

.repo-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.repo-card-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-brand);
  letter-spacing: -0.01em;
  transition: color 0.25s;
}

.repo-card:hover .repo-card-name {
  color: var(--vp-c-brand-1);
}

.repo-card-description {
  flex: 1;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.repo-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--vp-c-divider);
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}

.repo-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.lang-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.repo-updated {
  margin-left: auto;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}

@media (max-width: 768px) {
  .forked-repos-title {
    font-size: 1.5rem;
  }

  .repo-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .repo-card {
    padding: 1rem 1.1rem;
    min-height: auto;
  }

  .repo-card-name {
    font-size: 1rem;
  }
}
</style>
