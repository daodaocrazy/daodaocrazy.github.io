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
    default: '#b5653f'
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
  background: linear-gradient(135deg, #f8ecd8 0%, #efe0c6 100%);
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
  stroke: rgba(91, 69, 42, 0.08);
  stroke-width: 1;
}

.travel-route-preview__halo {
  fill: rgba(181, 101, 63, 0.08);
}

.travel-route-preview__path-shadow {
  fill: none;
  stroke: rgba(58, 39, 22, 0.12);
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
  fill: #fff7ec;
  stroke: #7f5237;
  stroke-width: 3;
}

.travel-route-preview__end {
  fill: var(--travel-route-color);
  stroke: #fff7ec;
  stroke-width: 3;
}
</style>