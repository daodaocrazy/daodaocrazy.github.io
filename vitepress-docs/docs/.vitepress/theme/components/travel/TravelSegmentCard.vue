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
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 250, 241, 0.98), rgba(241, 226, 207, 0.88));
}

.travel-segment-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b5653f;
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
  border-bottom: 1px dashed rgba(89, 60, 37, 0.12);
}

.travel-segment-card dt {
  font-size: 12px;
  color: #7f6956;
}

.travel-segment-card dd {
  margin: 6px 0 0;
  color: #2c1d10;
}

.travel-segment-card p:last-child {
  margin-top: 16px;
  line-height: 1.72;
  color: #5d4632;
}
</style>