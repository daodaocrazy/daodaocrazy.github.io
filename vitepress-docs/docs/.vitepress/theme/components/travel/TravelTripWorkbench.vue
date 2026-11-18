<script setup>
import { computed, ref, watch } from 'vue'
import { useData } from 'vitepress'

import TravelDayTabs from './TravelDayTabs.vue'
import TravelMapPanel from './TravelMapPanel.vue'
import TravelTimeline from './TravelTimeline.vue'
import {
  buildTravelTripViewModel,
  formatTravelDateRange,
  formatTravelDistance,
  formatTravelDuration
} from '../../utils/travel-memory-view-model.mjs'
import { getTravelTripBySlug } from '../../utils/travel-memory-source.mjs'

const { frontmatter } = useData()

const selectedDayNumber = ref(null)
const selectedStopId = ref(null)
const selectedSegmentId = ref(null)

const tripEnvelope = computed(() => {
  const slug = frontmatter.value.travelSlug
  return slug ? getTravelTripBySlug(slug) : null
})

const viewModel = computed(() => tripEnvelope.value ? buildTravelTripViewModel(tripEnvelope.value) : null)
const selectedDay = computed(() => viewModel.value?.days.find((day) => day.dayNumber === selectedDayNumber.value) ?? viewModel.value?.days[0] ?? null)

function sumBy(items, selector) {
  return items.reduce((total, item) => total + (Number.isFinite(selector(item)) ? selector(item) : 0), 0)
}

const tripStats = computed(() => {
  if (!viewModel.value) {
    return null
  }

  return {
    distance: formatTravelDistance(sumBy(viewModel.value.allSegments, (segment) => segment.distanceMeters)),
    stopCount: viewModel.value.allStops.length,
    moving: formatTravelDuration(sumBy(viewModel.value.allSegments, (segment) => segment.durationMinutes)),
    staying: formatTravelDuration(sumBy(viewModel.value.allStops, (stop) => stop.stayMinutes))
  }
})

function selectDay(dayNumber) {
  const day = viewModel.value?.days.find((item) => item.dayNumber === dayNumber) ?? viewModel.value?.days[0] ?? null
  selectedDayNumber.value = day?.dayNumber ?? null
  selectedStopId.value = day?.stops[0]?.id ?? null
  selectedSegmentId.value = null
}

function selectStop(stopId) {
  const stop = viewModel.value?.allStops.find((item) => item.id === stopId) ?? null
  selectedDayNumber.value = stop?.dayNumber ?? selectedDayNumber.value
  selectedStopId.value = stopId
  selectedSegmentId.value = null
}

function selectSegment(segmentId) {
  const segment = viewModel.value?.allSegments.find((item) => item.id === segmentId) ?? null
  selectedDayNumber.value = segment?.dayNumber ?? selectedDayNumber.value
  selectedSegmentId.value = segmentId
  selectedStopId.value = null
}

watch(viewModel, (nextViewModel) => {
  if (!nextViewModel) {
    selectedDayNumber.value = null
    selectedStopId.value = null
    selectedSegmentId.value = null
    return
  }

  selectDay(nextViewModel.initialDayNumber)
}, { immediate: true })
</script>

<template>
  <section v-if="viewModel" class="travel-trip-workbench">
    <header class="travel-trip-workbench__hero">
      <div class="travel-trip-workbench__hero-main">
        <p class="travel-trip-workbench__eyebrow">Travel Memory Atlas</p>
        <h1>{{ viewModel.trip.title }}</h1>
        <p class="travel-trip-workbench__intro">{{ viewModel.trip.intro }}</p>
        <ul class="travel-trip-workbench__tags">
          <li v-for="tag in viewModel.trip.tags" :key="tag">{{ tag }}</li>
        </ul>
      </div>

      <dl class="travel-trip-workbench__stats">
        <div>
          <dt>行程</dt>
          <dd>{{ formatTravelDateRange(viewModel.trip.startDate, viewModel.trip.endDate) }}</dd>
        </div>
        <div>
          <dt>地区</dt>
          <dd>{{ viewModel.trip.region }}</dd>
        </div>
        <div>
          <dt>天数</dt>
          <dd>{{ viewModel.trip.daysCount }} 天</dd>
        </div>
        <div>
          <dt>总里程</dt>
          <dd>{{ tripStats.distance }}</dd>
        </div>
        <div>
          <dt>在路上</dt>
          <dd>{{ tripStats.moving }}</dd>
        </div>
        <div>
          <dt>停留</dt>
          <dd>{{ tripStats.staying }}</dd>
        </div>
      </dl>
    </header>

    <TravelDayTabs :days="viewModel.days" :selected-day-number="selectedDayNumber" @select-day="selectDay" />

    <section class="travel-trip-workbench__detail-grid">
      <div class="travel-trip-workbench__map-column">
        <TravelMapPanel
          :view-model="viewModel"
          :selected-day-number="selectedDayNumber"
          :selected-stop-id="selectedStopId"
          :selected-segment-id="selectedSegmentId"
          @select-stop="selectStop"
          @select-segment="selectSegment"
        />
      </div>

      <TravelTimeline
        :day-model="selectedDay"
        :selected-stop-id="selectedStopId"
        :selected-segment-id="selectedSegmentId"
        @select-stop="selectStop"
        @select-segment="selectSegment"
      />
    </section>

    <section class="travel-trip-workbench__recap">
      <p class="travel-trip-workbench__section-eyebrow">整趟复盘</p>
      <ol class="travel-trip-workbench__route">
        <li v-for="place in viewModel.trip.places" :key="place">{{ place }}</li>
      </ol>
      <p class="travel-trip-workbench__recap-text">{{ viewModel.trip.summary }}</p>
    </section>
  </section>

  <section v-else class="travel-trip-workbench__fallback">
    <h1>未找到对应旅行</h1>
    <p>当前详情页没有读到匹配的 travelSlug。</p>
  </section>
</template>

<style scoped>
.travel-trip-workbench {
  display: grid;
  gap: 22px;
  padding: 8px 0 12px;
  color: var(--travel-ink);
}

.travel-trip-workbench__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 28px;
  align-items: end;
  padding: 28px 30px;
  border: 1px solid var(--travel-line);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--travel-accent) 18%, transparent), transparent 42%),
    linear-gradient(135deg, var(--travel-hero-start) 0%, var(--travel-hero-end) 100%);
}

.travel-trip-workbench__eyebrow,
.travel-trip-workbench__section-eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-trip-workbench__hero h1 {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 42px);
  line-height: 1.08;
  color: var(--travel-ink);
}

.travel-trip-workbench__intro {
  max-width: 56ch;
  margin: 12px 0 0;
  line-height: 1.72;
  color: var(--travel-muted);
}

.travel-trip-workbench__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.travel-trip-workbench__tags li {
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 12px;
  font-weight: 600;
}

.travel-trip-workbench__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 18px;
  margin: 0;
}

.travel-trip-workbench__stats dt {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--travel-soft);
}

.travel-trip-workbench__stats dd {
  margin: 5px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--travel-ink);
}

.travel-trip-workbench__detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.travel-trip-workbench__map-column {
  position: sticky;
  top: calc(var(--vp-nav-height) + 18px);
}

.travel-trip-workbench__recap {
  padding: 24px 26px;
  border: 1px solid var(--travel-line);
  border-radius: 22px;
  background: var(--travel-surface);
}

.travel-trip-workbench__route {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: place;
}

.travel-trip-workbench__route li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px 7px 9px;
  border: 1px solid var(--travel-line);
  border-radius: 999px;
  background: var(--travel-surface-elevated);
  font-size: 13px;
  font-weight: 600;
}

.travel-trip-workbench__route li::before {
  counter-increment: place;
  content: counter(place);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--travel-accent-soft);
  color: var(--travel-accent);
  font-size: 11px;
  font-weight: 700;
}

.travel-trip-workbench__recap-text {
  margin: 16px 0 0;
  line-height: 1.72;
  color: var(--travel-muted);
}

.travel-trip-workbench__fallback {
  padding: 28px;
  border: 1px solid var(--travel-line);
  border-radius: 22px;
  background: var(--travel-surface);
}

.travel-trip-workbench__fallback h1 {
  margin: 0;
}

.travel-trip-workbench__fallback p {
  margin: 10px 0 0;
  color: var(--travel-muted);
}

@media (max-width: 1023px) {
  .travel-trip-workbench__hero,
  .travel-trip-workbench__detail-grid {
    grid-template-columns: 1fr;
  }

  .travel-trip-workbench__map-column {
    position: static;
  }
}

@media (max-width: 600px) {
  .travel-trip-workbench__hero {
    padding: 22px 20px;
  }

  .travel-trip-workbench__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
