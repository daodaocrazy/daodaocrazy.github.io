<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRoute } from 'vitepress'

const route = useRoute()
const { theme } = useData()
const headers = ref([])
const activeLink = ref('')
let sectionObserver = null

const isStudyPage = computed(() => route.path.startsWith('/study/'))
const outlineLabel = computed(() => theme.value.outline?.label || '页内目录')

function collectHeaders() {
  if (typeof document === 'undefined' || !isStudyPage.value) {
    headers.value = []
    activeLink.value = ''
    return
  }

  const nodes = Array.from(document.querySelectorAll('.vp-doc h1[id], .vp-doc h2[id]'))
  const nextHeaders = []
  let currentParent = null

  for (const node of nodes) {
    const title = node.textContent?.trim()
    const link = `#${node.id}`

    if (!title) {
      continue
    }

    if (node.tagName === 'H1') {
      currentParent = { title, link, children: [] }
      nextHeaders.push(currentParent)
      continue
    }

    if (currentParent) {
      currentParent.children.push({ title, link })
      continue
    }

    nextHeaders.push({ title, link, children: [] })
  }

  headers.value = nextHeaders
}

function resolveActiveLink() {
  if (typeof document === 'undefined' || !isStudyPage.value) {
    activeLink.value = ''
    return
  }

  const nodes = Array.from(document.querySelectorAll('.vp-doc h1[id], .vp-doc h2[id]'))

  if (!nodes.length) {
    activeLink.value = ''
    return
  }

  const viewportOffset = 140
  let current = nodes[0]

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) {
      continue
    }

    if (node.getBoundingClientRect().top - viewportOffset <= 0) {
      current = node
      continue
    }

    break
  }

  activeLink.value = current?.id ? `#${current.id}` : ''
}

function disconnectObserver() {
  sectionObserver?.disconnect()
  sectionObserver = null
}

function registerObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !isStudyPage.value) {
    return
  }

  disconnectObserver()

  const nodes = Array.from(document.querySelectorAll('.vp-doc h1[id], .vp-doc h2[id]'))

  if (!nodes.length) {
    return
  }

  if (typeof window.IntersectionObserver !== 'function') {
    window.addEventListener('scroll', resolveActiveLink, { passive: true })
    return
  }

  sectionObserver = new window.IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting && entry.target instanceof HTMLElement)
      .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)

    if (visibleEntries.length) {
      const current = visibleEntries[0].target
      activeLink.value = current.id ? `#${current.id}` : activeLink.value
      return
    }

    resolveActiveLink()
  }, {
    rootMargin: '-120px 0px -55% 0px',
    threshold: [0, 1]
  })

  for (const node of nodes) {
    if (node instanceof HTMLElement) {
      sectionObserver.observe(node)
    }
  }
}

async function refreshHeaders() {
  await nextTick()
  requestAnimationFrame(() => {
    collectHeaders()
    resolveActiveLink()
    registerObserver()
  })
}

onMounted(() => {
  refreshHeaders()
  window.addEventListener('hashchange', resolveActiveLink)
})

onBeforeUnmount(() => {
  disconnectObserver()
  window.removeEventListener('scroll', resolveActiveLink)
  window.removeEventListener('hashchange', resolveActiveLink)
})

watch(() => route.path, () => {
  refreshHeaders()
})
</script>

<template>
  <aside
    v-if="isStudyPage && headers.length > 0"
    class="study-page-outline"
    aria-labelledby="study-page-outline-title"
  >
    <div class="study-page-outline__content">
      <div id="study-page-outline-title" class="study-page-outline__title">
        {{ outlineLabel }}
      </div>

      <ul class="study-page-outline__list">
        <li v-for="header in headers" :key="header.link" class="study-page-outline__item">
          <a
            class="study-page-outline__link"
            :class="{ 'study-page-outline__link--active': activeLink === header.link }"
            :href="header.link"
          >{{ header.title }}</a>

          <ul v-if="header.children?.length" class="study-page-outline__children">
            <li v-for="child in header.children" :key="child.link" class="study-page-outline__child">
              <a
                class="study-page-outline__link study-page-outline__link--child"
                :class="{ 'study-page-outline__link--active': activeLink === child.link }"
                :href="child.link"
              >{{ child.title }}</a>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.study-page-outline {
  display: none;
}

@media (min-width: 1100px) {
  .study-page-outline {
    position: fixed;
    top: calc(var(--vp-nav-height) + var(--vp-layout-top-height, 0px) + 48px);
    right: max(20px, calc((100vw - var(--vp-layout-max-width)) / 2 + 20px));
    z-index: 30;
    display: block;
    width: 224px;
    max-height: calc(100vh - var(--vp-nav-height) - 88px);
    overflow-y: auto;
    scrollbar-width: thin;
  }
}

.study-page-outline__content {
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 16px;
  color: var(--vp-c-text-2);
}

.study-page-outline__title {
  line-height: 32px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.study-page-outline__list,
.study-page-outline__children {
  margin: 0;
  padding: 0;
  list-style: none;
}

.study-page-outline__item,
.study-page-outline__child {
  margin: 0;
}

.study-page-outline__children {
  margin-top: 6px;
  padding-left: 12px;
}

.study-page-outline__link {
  display: block;
  padding: 6px 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.45;
  text-decoration: none;
  transition: color 0.2s ease;
}

.study-page-outline__link:hover {
  color: var(--vp-c-brand-1);
}

.study-page-outline__link--active {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.study-page-outline__link--child {
  font-size: 12px;
}
</style>