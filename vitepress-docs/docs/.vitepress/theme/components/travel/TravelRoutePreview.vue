<script setup>
import { computed } from 'vue'

import {
  projectCoordinateToViewport,
  projectTravelLineToViewport
} from '../../utils/travel-memory-view-model.mjs'

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
    default: 180
  }
})

const projection = computed(() => projectTravelLineToViewport(props.routePreview?.line?.coordinates ?? [], {
  width: props.width,
  height: props.height,
  padding: 18,
  bounds: props.routePreview?.bbox ?? null
}))

const startPoint = computed(() => projection.value.points[0] ?? null)
const endPoint = computed(() => projection.value.points.at(-1) ?? null)

const centerPoint = computed(() => projectCoordinateToViewport(props.routePreview?.center ?? [0, 0], {
  width: props.width,
  height: props.height,
  padding: 18,
  bounds: props.routePreview?.bbox ?? null
}))

const verticalGuides = [0.16, 0.34, 0.52, 0.7, 0.88]
const horizontalGuides = [0.2, 0.4, 0.6, 0.8]
</script>

<template>
  <div class="travel-route-preview">
    <svg :viewBox="projection.viewBox" aria-hidden="true" class="travel-route-preview__svg">
      <rect x="0" y="0" :width="width" :height="height" rx="22" class="travel-route-preview__surface" />
      <g class="travel-route-preview__guides">
        <line
          v-for="ratio in verticalGuides"
          :key="`vertical-${ratio}`"
          :x1="width * ratio"
          :x2="width * ratio"
          y1="0"
          :y2="height"
        />
        <line
          v-for="ratio in horizontalGuides"
          :key="`horizontal-${ratio}`"
          x1="0"
          :x2="width"
          :y1="height * ratio"
          :y2="height * ratio"
        />
      </g>
      <circle :cx="centerPoint.x" :cy="centerPoint.y" r="42" class="travel-route-preview__halo" />
      <path :d="projection.path" class="travel-route-preview__path-shadow" />
      <path :d="projection.path" class="travel-route-preview__path" :style="{ '--travel-route-color': accentColor }" />
      <circle v-if="startPoint" :cx="startPoint.x" :cy="startPoint.y" r="7" class="travel-route-preview__start" />
      <circle v-if="endPoint" :cx="endPoint.x" :cy="endPoint.y" r="7" class="travel-route-preview__end" :style="{ '--travel-route-color': accentColor }" />
    </svg>
  </div>
</template>

<style scoped>
.travel-route-preview {
  border: 1px solid var(--travel-line);
  background: linear-gradient(135deg, var(--travel-surface) 0%, var(--travel-surface-alt) 100%);
  border-radius: 22px;
  overflow: hidden;
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
  stroke: color-mix(in srgb, var(--travel-line) 70%, transparent);
  stroke-width: 1;
}

.travel-route-preview__halo {
  fill: var(--travel-accent-soft);
}

.travel-route-preview__path-shadow {
  fill: none;
  stroke: var(--travel-map-line-shadow);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 12;
}

.travel-route-preview__path {
  fill: none;
  stroke: var(--travel-route-color);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 7;
}

.travel-route-preview__start {
  fill: var(--travel-surface-elevated);
  stroke: color-mix(in srgb, var(--travel-route-color) 40%, var(--travel-ink));
  stroke-width: 3;
}

.travel-route-preview__end {
  fill: var(--travel-route-color);
  stroke: var(--travel-surface-elevated);
  stroke-width: 3;
}
</style>