<script setup>
defineProps({
  days: {
    type: Array,
    required: true
  },
  selectedDayNumber: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['select-day'])
</script>

<template>
  <nav class="travel-day-tabs" aria-label="旅行天数切换">
    <button
      v-for="day in days"
      :key="day.dayNumber"
      type="button"
      class="travel-day-tabs__button"
      :class="{ 'is-active': selectedDayNumber === day.dayNumber }"
      :style="{ '--travel-day-color': day.color }"
      @click="emit('select-day', day.dayNumber)"
    >
      <span class="travel-day-tabs__index">Day {{ day.dayNumber }}</span>
      <strong>{{ day.title }}</strong>
      <span class="travel-day-tabs__date">{{ day.date }}</span>
    </button>
  </nav>
</template>

<style scoped>
.travel-day-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.travel-day-tabs__button {
  min-width: 180px;
  padding: 14px 16px;
  border: 1px solid var(--travel-line);
  border-radius: 18px;
  background: var(--travel-surface);
  color: var(--travel-ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.travel-day-tabs__button:hover {
  transform: translateY(-1px);
  border-color: var(--travel-line-strong);
}

.travel-day-tabs__button.is-active {
  border-color: color-mix(in srgb, var(--travel-day-color) 46%, var(--travel-line-strong));
  background: color-mix(in srgb, var(--travel-surface-alt) 78%, var(--travel-day-color) 22%);
  box-shadow: var(--travel-shadow);
}

.travel-day-tabs__button strong,
.travel-day-tabs__index,
.travel-day-tabs__date {
  display: block;
}

.travel-day-tabs__index {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--travel-day-color);
}

.travel-day-tabs__date {
  margin-top: 6px;
  font-size: 13px;
  color: var(--travel-muted);
}
</style>