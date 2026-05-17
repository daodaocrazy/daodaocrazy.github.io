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

interface CategorizedRepos {
  [key: string]: Repository[]
}

const repos = ref<Repository[]>([])
const loading = ref(true)
const error = ref('')
const isCollapsed = ref(true)

const GITHUB_USERNAME = 'daodaocrazy'
const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`

const LANGUAGE_CATEGORIES: Record<string, string> = {
  'JavaScript': '前端开发',
  'TypeScript': '前端开发',
  'HTML': '前端开发',
  'CSS': '前端开发',
  'Vue': '前端开发',
  'React': '前端开发',
  'Java': 'Java开发',
  'Scala': 'Java开发',
  'Python': 'Python开发',
  'Go': 'Go开发',
  'Rust': 'Rust开发',
  'C': '系统编程',
  'C++': '系统编程',
  'Shell': '脚本工具',
  'Dockerfile': '容器技术',
  'Makefile': '构建工具'
}

const categorizedRepos = computed<CategorizedRepos>(() => {
  const result: CategorizedRepos = {}
  
  repos.value.forEach(repo => {
    const language = repo.language || '其他'
    const category = LANGUAGE_CATEGORIES[language] || '其他'
    
    if (!result[category]) {
      result[category] = []
    }
    
    result[category].push(repo)
  })
  
  return result
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const fetchRepos = async () => {
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch repositories')
    }
    const data = await response.json()
    repos.value = data.filter((repo: Repository) => repo.fork)
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
    <h2 class="forked-repos-title" @click="toggleCollapse">
      <span class="toggle-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
      🍴 Fork 的仓库
    </h2>
    
    <div v-if="loading" class="loading">
      <span>加载中...</span>
    </div>
    
    <div v-else-if="error" class="error">
      <span>{{ error }}</span>
    </div>
    
    <div v-else-if="Object.keys(categorizedRepos).length === 0" class="empty">
      <span>暂无 fork 的仓库</span>
    </div>
    
    <transition name="collapse">
      <div v-else v-show="!isCollapsed" class="repo-categories">
        <div v-for="(categoryRepos, category) in categorizedRepos" :key="category" class="repo-category">
          <h3 class="category-title">📁 {{ category }}</h3>
          <div class="repo-list">
            <div v-for="repo in categoryRepos" :key="repo.html_url" class="repo-item">
              <a :href="repo.html_url" target="_blank" rel="noopener" class="repo-name">
                {{ repo.name }}
              </a>
              <p class="repo-description">{{ repo.description || '暂无描述' }}</p>
              <div class="repo-meta">
                <span v-if="repo.language" class="repo-language">{{ repo.language }}</span>
                <span class="repo-stars">⭐ {{ repo.stargazers_count }}</span>
                <span class="repo-forks">🔀 {{ repo.forks_count }}</span>
                <span class="repo-updated">📅 {{ formatDate(repo.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.forked-repos {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

.forked-repos-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.3s ease;
  user-select: none;
}

.forked-repos-title:hover {
  opacity: 0.8;
}

.toggle-icon {
  display: inline-block;
  transition: transform 0.3s ease;
  font-size: 1.2rem;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-2);
}

.repo-categories {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.repo-category {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-title {
  font-size: 1.3rem;
  color: var(--vp-c-text-1);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.3);
}

.repo-list {
  display: grid;
  gap: 1rem;
}

.repo-item {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;
}

.repo-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.5);
}

.repo-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #667eea;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.repo-name:hover {
  color: #764ba2;
  text-decoration: underline;
}

.repo-description {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.repo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.repo-meta span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.repo-language {
  background: rgba(102, 126, 234, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: #667eea;
  font-weight: 500;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .forked-repos-title {
    font-size: 1.5rem;
  }
  
  .category-title {
    font-size: 1.2rem;
  }
  
  .repo-item {
    padding: 1rem;
  }
  
  .repo-meta {
    gap: 0.5rem;
  }
}
</style>
