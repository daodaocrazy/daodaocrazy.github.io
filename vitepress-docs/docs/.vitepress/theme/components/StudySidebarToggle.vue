<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const storageKey = 'study-sidebar-collapsed'
const isCollapsed = ref(false)
const isStudyPage = computed(() => route.path.startsWith('/study/'))

function applyCollapsedState(value) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  const nextValue = isStudyPage.value && value

  document.body.classList.toggle('study-sidebar-collapsed', nextValue)
  window.localStorage.setItem(storageKey, String(nextValue))
  isCollapsed.value = nextValue
}

function syncCollapsedState() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  const savedValue = window.localStorage.getItem(storageKey) === 'true'
  document.body.classList.toggle('study-sidebar-collapsed', isStudyPage.value && savedValue)
  isCollapsed.value = isStudyPage.value && savedValue
}

function toggleSidebar() {
  applyCollapsedState(!isCollapsed.value)
}

onMounted(() => {
  syncCollapsedState()
})

watch(() => route.path, () => {
  syncCollapsedState()
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') {
    return
  }

  document.body.classList.remove('study-sidebar-collapsed')
})
</script>

<template>
  <button
    v-if="isStudyPage"
    class="study-sidebar-toggle"
    type="button"
    :aria-expanded="!isCollapsed"
    :aria-label="isCollapsed ? '展开左侧目录' : '收起左侧目录'"
    @click="toggleSidebar"
  >
    <span class="study-sidebar-toggle__icon" aria-hidden="true">≡</span>
    <span>{{ isCollapsed ? '展开目录' : '收起目录' }}</span>
  </button>
</template>