<script setup>
import { computed, ref, watch } from 'vue'
import { useData } from 'vitepress'

import TravelDayTabs from './TravelDayTabs.vue'
import TravelMapPanel from './TravelMapPanel.vue'
import TravelSegmentCard from './TravelSegmentCard.vue'
import TravelStopCard from './TravelStopCard.vue'
import TravelTimeline from './TravelTimeline.vue'
import {
  buildTravelTripViewModel,
  formatTravelDateRange
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
const selectedStop = computed(() => viewModel.value?.allStops.find((stop) => stop.id === selectedStopId.value) ?? null)
const selectedSegment = computed(() => viewModel.value?.allSegments.find((segment) => segment.id === selectedSegmentId.value) ?? null)

const selectedSegmentFromStop = computed(() => viewModel.value?.allStops.find((stop) => stop.id === selectedSegment.value?.fromStopId) ?? null)
const selectedSegmentToStop = computed(() => viewModel.value?.allStops.find((stop) => stop.id === selectedSegment.value?.toStopId) ?? null)

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
      <p class="travel-trip-workbench__eyebrow">Travel Memory Atlas</p>
      <div class="travel-trip-workbench__meta">
        <span>{{ formatTravelDateRange(viewModel.trip.startDate, viewModel.trip.endDate) }}</span>
        <span>{{ viewModel.trip.region }}</span>
        <span>{{ viewModel.trip.daysCount }} 天</span>
      </div>
      <h1>{{ viewModel.trip.title }}</h1>
      <p class="travel-trip-workbench__intro">{{ viewModel.trip.intro }}</p>
      <ul class="travel-trip-workbench__tags">
        <li v-for="tag in viewModel.trip.tags" :key="tag">{{ tag }}</li>
      </ul>
    </header>

    <TravelMapPanel
      :view-model="viewModel"
      :selected-day-number="selectedDayNumber"
      :selected-stop-id="selectedStopId"
      :selected-segment-id="selectedSegmentId"
      @select-stop="selectStop"
      @select-segment="selectSegment"
    />

    <TravelDayTabs :days="viewModel.days" :selected-day-number="selectedDayNumber" @select-day="selectDay" />

    <section class="travel-trip-workbench__summary-grid">
      <article>
        <p class="travel-trip-workbench__section-eyebrow">当天回放</p>
        <h2>{{ selectedDay?.title }}</h2>
        <p>{{ selectedDay?.summary }}</p>
      </article>

      <article>
        <p class="travel-trip-workbench__section-eyebrow">整趟复盘</p>
        <h2>{{ viewModel.trip.places.join(' → ') }}</h2>
        <p>{{ viewModel.trip.summary }}</p>
      </article>
    </section>

    <section class="travel-trip-workbench__detail-grid">
      <TravelTimeline
        :day-model="selectedDay"
        :selected-stop-id="selectedStopId"
        :selected-segment-id="selectedSegmentId"
        @select-stop="selectStop"
        @select-segment="selectSegment"
      />

      <div class="travel-trip-workbench__cards">
        <TravelStopCard v-if="selectedStop" :stop="selectedStop" />
        <TravelSegmentCard
          v-else-if="selectedSegment"
          :segment="selectedSegment"
          :from-stop="selectedSegmentFromStop"
          :to-stop="selectedSegmentToStop"
        />
        <article v-else class="travel-trip-workbench__placeholder">
          <p class="travel-trip-workbench__section-eyebrow">点击地图或时间轴</p>
          <h2>等待聚焦一个记忆片段</h2>
          <p>点一个站点可以看备注和停留信息，点一段移动可以看交通方式、距离、耗时和路段摘要。</p>
        </article>
      </div>
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
  gap: 24px;
  padding: 16px 0 12px;
}

.travel-trip-workbench__hero {
  padding: 28px 30px;
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(181, 101, 63, 0.18), transparent 34%),
    linear-gradient(135deg, #fffaf1 0%, #f5e3cb 100%);
}

.travel-trip-workbench__eyebrow,
.travel-trip-workbench__section-eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b5653f;
}

.travel-trip-workbench__hero h1,
.travel-trip-workbench__hero p,
.travel-trip-workbench__summary-grid h2,
.travel-trip-workbench__summary-grid p,
.travel-trip-workbench__fallback h1,
.travel-trip-workbench__fallback p,
.travel-trip-workbench__placeholder h2,
.travel-trip-workbench__placeholder p {
  margin: 0;
}

.travel-trip-workbench__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: #7f6956;
}

.travel-trip-workbench__hero h1 {
  margin-top: 12px;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.04;
  color: #2c1d10;
}

.travel-trip-workbench__intro {
  margin-top: 14px !important;
  max-width: 62ch;
  line-height: 1.75;
  color: #5d4632;
}

.travel-trip-workbench__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.travel-trip-workbench__tags li {
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(181, 101, 63, 0.1);
  color: #b5653f;
  font-size: 12px;
}

.travel-trip-workbench__summary-grid,
.travel-trip-workbench__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.travel-trip-workbench__summary-grid article,
.travel-trip-workbench__placeholder,
.travel-trip-workbench__fallback {
  padding: 22px;
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 24px;
  background: rgba(255, 250, 241, 0.88);
}

.travel-trip-workbench__summary-grid p:last-child,
.travel-trip-workbench__placeholder p:last-child,
.travel-trip-workbench__fallback p {
  margin-top: 10px;
  line-height: 1.72;
  color: #5d4632;
}

.travel-trip-workbench__cards {
  display: grid;
}

@media (max-width: 960px) {
  .travel-trip-workbench__summary-grid,
  .travel-trip-workbench__detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>