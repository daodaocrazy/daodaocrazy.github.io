<script setup>
import { computed } from 'vue'

import {
  formatTravelDistance,
  formatTravelDuration,
  formatTravelMode
} from '../../utils/travel-memory-view-model.mjs'

const props = defineProps({
  dayModel: {
    type: Object,
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

const timelineItems = computed(() => props.dayModel?.timelineItems ?? [])
</script>

<template>
  <section class="travel-timeline">
    <header class="travel-timeline__header">
      <p class="travel-timeline__eyebrow">Day Replay</p>
      <h2>{{ dayModel ? dayModel.title : '当天时间轴' }}</h2>
      <p v-if="dayModel">{{ dayModel.summary }}</p>
    </header>

    <div v-if="timelineItems.length > 0" class="travel-timeline__list">
      <button
        v-for="item in timelineItems"
        :key="item.id"
        type="button"
        class="travel-timeline__item"
        :class="{
          'is-stop': item.kind === 'stop',
          'is-segment': item.kind === 'segment',
          'is-active': item.kind === 'stop' ? selectedStopId === item.id : selectedSegmentId === item.id
        }"
        @click="item.kind === 'stop' ? emit('select-stop', item.id) : emit('select-segment', item.id)"
      >
        <template v-if="item.kind === 'stop'">
          <span class="travel-timeline__kind">站点</span>
          <strong>{{ item.stop.name }}</strong>
          <span>{{ item.stop.arrivalTime }} - {{ item.stop.departureTime }}</span>
          <span>{{ item.stop.note }}</span>
        </template>

        <template v-else>
          <span class="travel-timeline__kind">路段</span>
          <strong>{{ formatTravelMode(item.segment.mode) }}</strong>
          <span>{{ formatTravelDistance(item.segment.distanceMeters) }} · {{ formatTravelDuration(item.segment.durationMinutes) }}</span>
          <span>{{ item.segment.summary }}</span>
        </template>
      </button>
    </div>

    <p v-else class="travel-timeline__empty">当前还没有可展示的当天时间轴。</p>
  </section>
</template>

<style scoped>
.travel-timeline {
  padding: 22px;
  border: 1px solid var(--travel-line);
  border-radius: 24px;
  background: var(--travel-surface);
  color: var(--travel-ink);
}

.travel-timeline__header h2,
.travel-timeline__header p {
  margin: 0;
}

.travel-timeline__header p:last-child {
  margin-top: 8px;
  color: var(--travel-muted);
  line-height: 1.7;
}

.travel-timeline__eyebrow {
  margin-bottom: 8px !important;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-timeline__list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.travel-timeline__item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--travel-line);
  border-radius: 18px;
  background: var(--travel-surface-elevated);
  color: var(--travel-ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.travel-timeline__item:hover {
  transform: translateY(-1px);
  border-color: var(--travel-line-strong);
  background: var(--travel-surface-alt);
}

.travel-timeline__item.is-active {
  border-color: var(--travel-accent-strong);
  background: var(--travel-accent-soft);
}

.travel-timeline__kind {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-timeline__empty {
  margin: 16px 0 0;
  color: var(--travel-muted);
}
</style>