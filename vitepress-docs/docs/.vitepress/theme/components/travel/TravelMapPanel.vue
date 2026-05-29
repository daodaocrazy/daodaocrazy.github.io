<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'

import {
  formatTravelDistance,
  formatTravelDuration,
  formatTravelMode,
  projectCoordinateToViewport,
  projectTravelLineToViewport
} from '../../utils/travel-memory-view-model.mjs'

const props = defineProps({
  viewModel: {
    type: Object,
    required: true
  },
  selectedDayNumber: {
    type: Number,
    default: null
  },
  selectedStopId: {
    type: String,
    default: null
  },
  selectedSegmentId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select-stop', 'select-segment'])

const mapWidth = 920
const mapHeight = 520
const mapPadding = 36

const selectedDay = computed(() => props.viewModel.days.find((day) => day.dayNumber === props.selectedDayNumber) ?? props.viewModel.days[0] ?? null)
const selectedStop = computed(() => props.viewModel.allStops.find((stop) => stop.id === props.selectedStopId) ?? null)
const selectedSegment = computed(() => props.viewModel.allSegments.find((segment) => segment.id === props.selectedSegmentId) ?? null)
const staticMapHref = computed(() => withBase(`/travel/${props.viewModel.trip.slug}/static-map.svg`))

const activeStopIds = computed(() => new Set(selectedDay.value?.stops.map((stop) => stop.id) ?? []))
const activeSegmentIds = computed(() => new Set(selectedDay.value?.segments.map((segment) => segment.id) ?? []))

const stopPoints = computed(() => new Map(props.viewModel.allStops.map((stop) => [
  stop.id,
  projectCoordinateToViewport(stop.coordinates, {
    width: mapWidth,
    height: mapHeight,
    padding: mapPadding,
    bounds: props.viewModel.bounds
  })
])))

const segmentPaths = computed(() => new Map(props.viewModel.allSegments.map((segment) => [
  segment.id,
  projectTravelLineToViewport(segment.routeGeometry.coordinates, {
    width: mapWidth,
    height: mapHeight,
    padding: mapPadding,
    bounds: props.viewModel.bounds
  })
])))

const callout = computed(() => {
  if (selectedStop.value) {
    return {
      title: selectedStop.value.name,
      meta: `${selectedStop.value.arrivalTime} - ${selectedStop.value.departureTime} · ${formatTravelDuration(selectedStop.value.stayMinutes)}`,
      body: selectedStop.value.note
    }
  }

  if (selectedSegment.value) {
    const fromStop = props.viewModel.allStops.find((stop) => stop.id === selectedSegment.value.fromStopId)
    const toStop = props.viewModel.allStops.find((stop) => stop.id === selectedSegment.value.toStopId)

    return {
      title: `${fromStop?.name ?? '起点'} → ${toStop?.name ?? '终点'}`,
      meta: `${formatTravelMode(selectedSegment.value.mode)} · ${formatTravelDistance(selectedSegment.value.distanceMeters)} · ${formatTravelDuration(selectedSegment.value.durationMinutes)}`,
      body: selectedSegment.value.summary
    }
  }

  return selectedDay.value
    ? {
        title: `Day ${selectedDay.value.dayNumber} · ${selectedDay.value.title}`,
        meta: `${selectedDay.value.stops.length} 个站点 · ${selectedDay.value.segments.length} 段移动`,
        body: selectedDay.value.summary
      }
    : null
})

function dayColor(dayNumber) {
  return props.viewModel.days.find((day) => day.dayNumber === dayNumber)?.color ?? 'var(--travel-accent)'
}

function isStopHighlighted(stop) {
  if (props.selectedStopId) {
    return stop.id === props.selectedStopId
  }

  return activeStopIds.value.has(stop.id)
}

function isSegmentHighlighted(segment) {
  if (props.selectedSegmentId) {
    return segment.id === props.selectedSegmentId
  }

  return activeSegmentIds.value.has(segment.id)
}
</script>

<template>
  <section class="travel-map-panel">
    <div class="travel-map-panel__surface">
      <div class="travel-map-panel__chrome">
        <p>Map View</p>
        <strong>{{ selectedDay ? `Day ${selectedDay.dayNumber}` : '全程' }}</strong>
      </div>

      <div class="travel-map-panel__legend">
        <span>静态城市地图</span>
        <span>{{ viewModel.trip.places.join(' · ') }}</span>
      </div>

      <svg viewBox="0 0 920 520" aria-label="旅行路线地图" class="travel-map-panel__svg">
        <image :href="staticMapHref" x="0" y="0" width="920" height="520" preserveAspectRatio="xMidYMid slice" class="travel-map-panel__image" />
        <rect x="0" y="0" width="920" height="520" rx="30" class="travel-map-panel__frame" />

        <g>
          <path
            v-for="segment in viewModel.allSegments"
            :key="`${segment.id}-shadow`"
            :d="segmentPaths.get(segment.id)?.path"
            class="travel-map-panel__segment-shadow"
          />
          <path
            v-for="segment in viewModel.allSegments"
            :key="segment.id"
            :d="segmentPaths.get(segment.id)?.path"
            class="travel-map-panel__segment"
            :class="{ 'is-highlighted': isSegmentHighlighted(segment), 'is-walk': segment.mode === 'walk' }"
            :style="{ '--travel-segment-color': dayColor(segment.dayNumber), '--travel-segment-opacity': activeSegmentIds.has(segment.id) ? 0.92 : 0.36 }"
            @click="emit('select-segment', segment.id)"
          />
        </g>

        <g>
          <g
            v-for="stop in viewModel.allStops"
            :key="stop.id"
            class="travel-map-panel__stop"
            :class="{ 'is-highlighted': isStopHighlighted(stop) }"
            @click="emit('select-stop', stop.id)"
          >
            <circle
              :cx="stopPoints.get(stop.id)?.x"
              :cy="stopPoints.get(stop.id)?.y"
              r="7"
              :style="{ '--travel-stop-color': dayColor(stop.dayNumber), '--travel-stop-opacity': activeStopIds.has(stop.id) ? 1 : 0.52 }"
            />
            <text
              v-if="activeStopIds.has(stop.id)"
              :x="(stopPoints.get(stop.id)?.x ?? 0) + 12"
              :y="(stopPoints.get(stop.id)?.y ?? 0) - 12"
            >
              {{ stop.name }}
            </text>
          </g>
        </g>

        <g class="travel-map-panel__scale">
          <line x1="64" y1="478" x2="164" y2="478" />
          <line x1="64" y1="472" x2="64" y2="484" />
          <line x1="114" y1="472" x2="114" y2="484" />
          <line x1="164" y1="472" x2="164" y2="484" />
          <text x="64" y="466">0 km</text>
          <text x="104" y="466">5 km</text>
          <text x="154" y="466">10 km</text>
        </g>
      </svg>

      <aside v-if="callout" class="travel-map-panel__callout">
        <p class="travel-map-panel__callout-eyebrow">当前聚焦</p>
        <h2>{{ callout.title }}</h2>
        <p class="travel-map-panel__callout-meta">{{ callout.meta }}</p>
        <p>{{ callout.body }}</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.travel-map-panel {
  position: relative;
}

.travel-map-panel__surface {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--travel-line);
  border-radius: 30px;
  background: linear-gradient(135deg, var(--travel-hero-start) 0%, var(--travel-hero-end) 100%);
}

.travel-map-panel__chrome {
  position: absolute;
  top: 20px;
  left: 22px;
  z-index: 2;
  padding: 10px 14px;
  border: 1px solid var(--travel-line);
  border-radius: 18px;
  background: var(--travel-surface-elevated);
  box-shadow: var(--travel-shadow);
}

.travel-map-panel__chrome p,
.travel-map-panel__chrome strong {
  margin: 0;
}

.travel-map-panel__chrome p {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-map-panel__chrome strong {
  color: var(--travel-ink);
}

.travel-map-panel__legend {
  position: absolute;
  top: 20px;
  right: 22px;
  z-index: 500;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: min(340px, calc(100% - 44px));
}

.travel-map-panel__legend span {
  padding: 9px 12px;
  border: 1px solid var(--travel-line);
  border-radius: 999px;
  background: var(--travel-surface-elevated);
  color: var(--travel-muted);
  font-size: 12px;
  font-weight: 600;
}

.travel-map-panel__svg {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
}

.travel-map-panel__image {
  opacity: 0.98;
  filter: var(--travel-map-image-filter);
}

.travel-map-panel__frame {
  fill: none;
  stroke: var(--travel-map-frame);
  stroke-width: 1.5;
}

.travel-map-panel__callout {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 2;
  max-width: min(320px, calc(100% - 36px));
  padding: 18px 20px;
  border: 1px solid var(--travel-line);
  border-radius: 22px;
  background: var(--travel-surface-elevated);
  backdrop-filter: blur(12px);
  box-shadow: var(--travel-shadow-strong);
  color: var(--travel-ink);
}

.travel-map-panel__segment-shadow {
  fill: none;
  stroke: var(--travel-map-line-shadow);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 11;
}

.travel-map-panel__segment {
  fill: none;
  stroke: color-mix(in srgb, var(--travel-segment-color) 84%, var(--travel-ink));
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 7;
  opacity: var(--travel-segment-opacity);
  cursor: pointer;
  transition: opacity 0.18s ease, stroke-width 0.18s ease;
}

.travel-map-panel__segment.is-highlighted {
  stroke-width: 9;
  opacity: 1;
}

.travel-map-panel__segment.is-walk {
  stroke-dasharray: 10 10;
}

.travel-map-panel__stop circle {
  fill: color-mix(in srgb, var(--travel-stop-color) 84%, var(--travel-surface-elevated));
  stroke: var(--travel-surface-elevated);
  stroke-width: 4;
  opacity: var(--travel-stop-opacity);
  cursor: pointer;
}

.travel-map-panel__stop text {
  fill: var(--travel-ink);
  font-size: 13px;
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--travel-map-label-stroke);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.travel-map-panel__scale line {
  stroke: var(--travel-map-scale);
  stroke-width: 2.5;
}

.travel-map-panel__scale text {
  fill: var(--travel-map-scale);
  font-size: 12px;
  font-weight: 700;
}

.travel-map-panel__callout-eyebrow,
.travel-map-panel__callout h2,
.travel-map-panel__callout p {
  margin: 0;
}

.travel-map-panel__callout-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-map-panel__callout h2 {
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.2;
  color: var(--travel-ink);
}

.travel-map-panel__callout-meta {
  margin-top: 8px !important;
  color: var(--travel-muted);
}

.travel-map-panel__callout p:last-child {
  margin-top: 10px;
  line-height: 1.68;
  color: var(--travel-muted);
}

@media (max-width: 768px) {
  .travel-map-panel__legend {
    position: static;
    justify-content: flex-start;
    padding: 16px 14px 0;
    max-width: none;
  }

  .travel-map-panel__callout {
    position: static;
    max-width: none;
    margin: 0 14px 14px;
  }
}
</style>