<script setup>
import { computed } from 'vue'

import { projectTravelLineToViewport } from '../../utils/travel-memory-view-model.mjs'

const props = defineProps({
  routePreview: {
    type: Object,
    required: true
  },
  accentColor: {
    type: String,
    default: 'var(--travel-accent)'
  },
  width: {
    type: Number,
    default: 320
  },
  height: {
    type: Number,
    default: 140
  }
})

const projection = computed(() => projectTravelLineToViewport(props.routePreview?.line?.coordinates ?? [], {
  width: props.width,
  height: props.height,
  padding: 22,
  bounds: props.routePreview?.bbox ?? null
}))

const startPoint = computed(() => projection.value.points[0] ?? null)
const endPoint = computed(() => projection.value.points.at(-1) ?? null)

const verticalGuides = computed(() => [0.2, 0.4, 0.6, 0.8].map((ratio) => ratio * props.width))
const horizontalGuides = computed(() => [0.25, 0.5, 0.75].map((ratio) => ratio * props.height))
</script>

<template>
  <div class="travel-route-preview">
    <svg
      :viewBox="projection.viewBox"
      aria-hidden="true"
      class="travel-route-preview__svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" :width="width" :height="height" rx="18" class="travel-route-preview__surface" />

      <g class="travel-route-preview__guides">
        <line v-for="x in verticalGuides" :key="`v-${x}`" :x1="x" :x2="x" y1="0" :y2="height" />
        <line v-for="y in horizontalGuides" :key="`h-${y}`" x1="0" :x2="width" :y1="y" :y2="y" />
      </g>

      <path :d="projection.path" class="travel-route-preview__path-shadow" />
      <path
        :d="projection.path"
        class="travel-route-preview__path"
        :style="{ '--travel-route-color': accentColor }"
      />

      <circle
        v-if="startPoint"
        :cx="startPoint.x"
        :cy="startPoint.y"
        r="5.5"
        class="travel-route-preview__start"
        :style="{ '--travel-route-color': accentColor }"
      />
      <circle
        v-if="endPoint"
        :cx="endPoint.x"
        :cy="endPoint.y"
        r="5.5"
        class="travel-route-preview__end"
        :style="{ '--travel-route-color': accentColor }"
      />
    </svg>
  </div>
</template>

<style scoped>
.travel-route-preview {
  border: 1px solid var(--travel-line);
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--travel-surface) 0%, var(--travel-surface-alt) 100%);
}

.travel-route-preview__svg {
  display: block;
  width: 100%;
  height: auto;
}

.travel-route-preview__surface {
  fill: transparent;
}

.travel-route-preview__guides line {
  stroke: color-mix(in srgb, var(--travel-line) 74%, transparent);
  stroke-width: 1;
  stroke-dasharray: 3 6;
}

.travel-route-preview__path-shadow {
  fill: none;
  stroke: var(--travel-map-line-shadow);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 11;
}

.travel-route-preview__path {
  fill: none;
  stroke: var(--travel-route-color);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.travel-route-preview__start {
  fill: var(--travel-surface-elevated);
  stroke: var(--travel-route-color);
  stroke-width: 3;
}

.travel-route-preview__end {
  fill: var(--travel-route-color);
  stroke: var(--travel-surface-elevated);
  stroke-width: 2.5;
}
</style>
