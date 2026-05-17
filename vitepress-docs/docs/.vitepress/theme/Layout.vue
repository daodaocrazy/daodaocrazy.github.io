
&lt;script setup lang="ts"&gt;
import { computed, onBeforeUnmount, onMounted, provide, useSlots } from 'vue'
import { Content, useRoute, useData } from 'vitepress'
import VPBackdrop from 'vitepress/dist/client/theme-default/components/VPBackdrop.vue'
import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'
import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue'
import VPLocalNav from 'vitepress/dist/client/theme-default/components/VPLocalNav.vue'
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue'
import VPSkipLink from 'vitepress/dist/client/theme-default/components/VPSkipLink.vue'
import {
  useCloseSidebarOnEscape,
  useSidebar
} from 'vitepress/dist/client/theme-default/composables/sidebar'
import StudyPageOutline from './components/StudyPageOutline.vue'
import StudySidebar from './components/StudySidebar.vue'
import StudySidebarToggle from './components/StudySidebarToggle.vue'
import ForkedRepos from './components/ForkedRepos.vue'

const {
  isOpen: isSidebarOpen,
  open: openSidebar,
  close: closeSidebar
} = useSidebar()

useRoute()

useCloseSidebarOnEscape(isSidebarOpen, closeSidebar)

function handleStudyCloseSidebar() {
  if (typeof window !== 'undefined' &amp;&amp; !window.matchMedia('(min-width: 960px)').matches) {
    closeSidebar()
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (typeof window === 'undefined' || window.matchMedia('(min-width: 960px)').matches) {
    return
  }

  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return
  }

  if (target.closest('.caret')) {
    return
  }

  if (!target.closest('.VPSidebar .link')) {
    return
  }

  closeSidebar()
}

onMounted(() =&gt; {
  window.addEventListener('study:close-sidebar', handleStudyCloseSidebar)
  document.addEventListener('click', handleDocumentClick, true)
})

onBeforeUnmount(() =&gt; {
  window.removeEventListener('study:close-sidebar', handleStudyCloseSidebar)
  document.removeEventListener('click', handleDocumentClick, true)
})

const { frontmatter } = useData()
const isHomePage = computed(() =&gt; frontmatter.value.layout === 'home')

const slots = useSlots()
const heroImageSlotExists = computed(() =&gt; !!slots['home-hero-image'])

provide('hero-image-slot-exists', heroImageSlotExists)
provide('study-close-sidebar', closeSidebar)
&lt;/script&gt;

&lt;template&gt;
  &lt;div v-if="frontmatter.layout !== false" class="Layout" :class="frontmatter.pageClass"&gt;
    &lt;StudySidebarToggle /&gt;
    &lt;StudyPageOutline /&gt;
    &lt;VPSkipLink /&gt;
    &lt;VPBackdrop class="backdrop" :show="isSidebarOpen" @click="closeSidebar" /&gt;
    &lt;VPNav&gt;
      &lt;template #nav-bar-title-before&gt;&lt;slot name="nav-bar-title-before" /&gt;&lt;/template&gt;
      &lt;template #nav-bar-title-after&gt;&lt;slot name="nav-bar-title-after" /&gt;&lt;/template&gt;
      &lt;template #nav-bar-content-before&gt;&lt;slot name="nav-bar-content-before" /&gt;&lt;/template&gt;
      &lt;template #nav-bar-content-after&gt;&lt;slot name="nav-bar-content-after" /&gt;&lt;/template&gt;
      &lt;template #nav-screen-content-before&gt;&lt;slot name="nav-screen-content-before" /&gt;&lt;/template&gt;
      &lt;template #nav-screen-content-after&gt;&lt;slot name="nav-screen-content-after" /&gt;&lt;/template&gt;
    &lt;/VPNav&gt;
    &lt;VPLocalNav :open="isSidebarOpen" @open-menu="openSidebar" /&gt;

    &lt;StudySidebar :open="isSidebarOpen"&gt;
      &lt;template #sidebar-nav-before&gt;&lt;slot name="sidebar-nav-before" /&gt;&lt;/template&gt;
      &lt;template #sidebar-nav-after&gt;&lt;slot name="sidebar-nav-after" /&gt;&lt;/template&gt;
    &lt;/StudySidebar&gt;

    &lt;VPContent&gt;
      &lt;template #page-top&gt;&lt;slot name="page-top" /&gt;&lt;/template&gt;
      &lt;template #page-bottom&gt;&lt;slot name="page-bottom" /&gt;&lt;/template&gt;

      &lt;template #not-found&gt;&lt;slot name="not-found" /&gt;&lt;/template&gt;
      &lt;template #home-hero-before&gt;&lt;slot name="home-hero-before" /&gt;&lt;/template&gt;
      &lt;template #home-hero-info-before&gt;&lt;slot name="home-hero-info-before" /&gt;&lt;/template&gt;
      &lt;template #home-hero-info&gt;&lt;slot name="home-hero-info" /&gt;&lt;/template&gt;
      &lt;template #home-hero-info-after&gt;&lt;slot name="home-hero-info-after" /&gt;&lt;/template&gt;
      &lt;template #home-hero-actions-after&gt;&lt;slot name="home-hero-actions-after" /&gt;&lt;/template&gt;
      &lt;template #home-hero-image&gt;&lt;slot name="home-hero-image" /&gt;&lt;/template&gt;
      &lt;template #home-hero-after&gt;&lt;slot name="home-hero-after" /&gt;&lt;/template&gt;
      &lt;template #home-features-before&gt;&lt;slot name="home-features-before" /&gt;&lt;/template&gt;
      &lt;template #home-features-after&gt;
        &lt;slot name="home-features-after" /&gt;
        &lt;ForkedRepos v-if="isHomePage" /&gt;
      &lt;/template&gt;

      &lt;template #doc-footer-before&gt;&lt;slot name="doc-footer-before" /&gt;&lt;/template&gt;
      &lt;template #doc-before&gt;&lt;slot name="doc-before" /&gt;&lt;/template&gt;
      &lt;template #doc-after&gt;&lt;slot name="doc-after" /&gt;&lt;/template&gt;
      &lt;template #doc-top&gt;&lt;slot name="doc-top" /&gt;&lt;/template&gt;
      &lt;template #doc-bottom&gt;&lt;slot name="doc-bottom" /&gt;&lt;/template&gt;

      &lt;template #aside-top&gt;&lt;slot name="aside-top" /&gt;&lt;/template&gt;
      &lt;template #aside-bottom&gt;&lt;slot name="aside-bottom" /&gt;&lt;/template&gt;
      &lt;template #aside-outline-before&gt;&lt;slot name="aside-outline-before" /&gt;&lt;/template&gt;
      &lt;template #aside-outline-after&gt;&lt;slot name="aside-outline-after" /&gt;&lt;/template&gt;
      &lt;template #aside-ads-before&gt;&lt;slot name="aside-ads-before" /&gt;&lt;/template&gt;
      &lt;template #aside-ads-after&gt;&lt;slot name="aside-ads-after" /&gt;&lt;/template&gt;
    &lt;/VPContent&gt;

    &lt;VPFooter /&gt;
    &lt;slot name="layout-bottom" /&gt;
  &lt;/div&gt;
  &lt;Content v-else /&gt;
&lt;/template&gt;

&lt;style scoped&gt;
.Layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
&lt;/style&gt;

