<script setup>
import {
  formatTravelDistance,
  formatTravelDuration,
  formatTravelMode
} from '../../utils/travel-memory-view-model.mjs'

defineProps({
  segment: {
    type: Object,
    required: true
  },
  fromStop: {
    type: Object,
    default: null
  },
  toStop: {
    type: Object,
    default: null
  }
})
</script>

<template>
  <article class="travel-segment-card">
    <p class="travel-segment-card__eyebrow">Segment Note</p>
    <h2>{{ fromStop?.name ?? '起点' }} → {{ toStop?.name ?? '终点' }}</h2>
    <dl>
      <div>
        <dt>交通方式</dt>
        <dd>{{ formatTravelMode(segment.mode) }}</dd>
      </div>
      <div>
        <dt>距离</dt>
        <dd>{{ formatTravelDistance(segment.distanceMeters) }}</dd>
      </div>
      <div>
        <dt>耗时</dt>
        <dd>{{ formatTravelDuration(segment.durationMinutes) }}</dd>
      </div>
    </dl>
    <p>{{ segment.summary }}</p>
  </article>
</template>

<style scoped>
.travel-segment-card {
  padding: 22px;
  border: 1px solid var(--travel-line);
  border-radius: 24px;
  background: linear-gradient(180deg, var(--travel-surface-elevated), var(--travel-surface-alt));
  color: var(--travel-ink);
}

.travel-segment-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-segment-card h2,
.travel-segment-card p,
.travel-segment-card dl {
  margin: 0;
}

.travel-segment-card dl {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.travel-segment-card dl div {
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--travel-line);
}

.travel-segment-card dt {
  font-size: 12px;
  color: var(--travel-soft);
}

.travel-segment-card dd {
  margin: 6px 0 0;
  color: var(--travel-ink);
}

.travel-segment-card p:last-child {
  margin-top: 16px;
  line-height: 1.72;
  color: var(--travel-muted);
}
</style>