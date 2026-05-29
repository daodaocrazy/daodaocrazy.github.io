<script setup>
import { computed } from 'vue'

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

const activeStopIds = computed(() => new Set(selectedDay.value?.stops.map((stop) => stop.id) ?? []))
const activeSegmentIds = computed(() => new Set(selectedDay.value?.segments.map((segment) => segment.id) ?? []))

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
  return props.viewModel.days.find((day) => day.dayNumber === dayNumber)?.color ?? '#3C8772'
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
        <p>Atlas View</p>
        <strong>{{ selectedDay ? `Day ${selectedDay.dayNumber}` : '全程' }}</strong>
      </div>

      <svg viewBox="0 0 920 520" aria-label="旅行路线总图" class="travel-map-panel__svg">
        <rect x="0" y="0" width="920" height="520" rx="30" class="travel-map-panel__paper" />
        <g class="travel-map-panel__grid">
          <line v-for="x in [90, 220, 350, 480, 610, 740, 870]" :key="`x-${x}`" :x1="x" :x2="x" y1="0" y2="520" />
          <line v-for="y in [80, 160, 240, 320, 400, 480]" :key="`y-${y}`" x1="0" x2="920" :y1="y" :y2="y" />
        </g>

        <g>
          <path
            v-for="segment in viewModel.allSegments"
            :key="segment.id"
            :d="segmentPaths.get(segment.id)?.path"
            class="travel-map-panel__segment"
            :class="{ 'is-highlighted': isSegmentHighlighted(segment) }"
            :style="{ '--travel-segment-color': dayColor(segment.dayNumber), '--travel-segment-opacity': activeSegmentIds.has(segment.id) ? 0.92 : 0.22 }"
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
              :style="{ '--travel-stop-color': dayColor(stop.dayNumber), '--travel-stop-opacity': activeStopIds.has(stop.id) ? 1 : 0.34 }"
            />
            <text
              v-if="activeStopIds.has(stop.id)"
              :x="(stopPoints.get(stop.id)?.x ?? 0) + 10"
              :y="(stopPoints.get(stop.id)?.y ?? 0) - 10"
            >
              {{ stop.name }}
            </text>
          </g>
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
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 30px;
  background: linear-gradient(135deg, #fff9ef 0%, #f4e2c9 100%);
}

.travel-map-panel__chrome {
  position: absolute;
  top: 20px;
  left: 22px;
  z-index: 2;
  padding: 10px 14px;
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 18px;
  background: rgba(255, 250, 241, 0.82);
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
  color: #b5653f;
}

.travel-map-panel__svg {
  display: block;
  width: 100%;
  height: auto;
}

.travel-map-panel__paper {
  fill: transparent;
}

.travel-map-panel__grid line {
  stroke: rgba(89, 60, 37, 0.08);
  stroke-width: 1;
}

.travel-map-panel__segment {
  fill: none;
  stroke: color-mix(in srgb, var(--travel-segment-color) 84%, #2c1d10);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 8;
  opacity: var(--travel-segment-opacity);
  cursor: pointer;
  transition: opacity 0.18s ease, stroke-width 0.18s ease;
}

.travel-map-panel__segment.is-highlighted {
  stroke-width: 10;
  opacity: 1;
}

.travel-map-panel__stop circle {
  fill: color-mix(in srgb, var(--travel-stop-color) 84%, #fff8ef);
  stroke: #fffaf1;
  stroke-width: 4;
  opacity: var(--travel-stop-opacity);
  cursor: pointer;
}

.travel-map-panel__stop text {
  fill: #2c1d10;
  font-size: 13px;
  font-weight: 600;
  paint-order: stroke;
  stroke: #fff9ef;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.travel-map-panel__callout {
  position: absolute;
  right: 18px;
  bottom: 18px;
  max-width: min(320px, calc(100% - 36px));
  padding: 18px 20px;
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 22px;
  background: rgba(255, 250, 241, 0.92);
  backdrop-filter: blur(12px);
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
  color: #b5653f;
}

.travel-map-panel__callout h2 {
  margin-top: 8px;
  font-size: 20px;
  line-height: 1.2;
}

.travel-map-panel__callout-meta {
  margin-top: 8px !important;
  color: #7f6956;
}

.travel-map-panel__callout p:last-child {
  margin-top: 10px;
  line-height: 1.68;
  color: #5d4632;
}

@media (max-width: 768px) {
  .travel-map-panel__callout {
    position: static;
    max-width: none;
    margin: 0 14px 14px;
  }
}
</style>