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
  border: 1px solid rgba(89, 60, 37, 0.14);
  border-radius: 18px;
  background: rgba(255, 250, 241, 0.88);
  color: #2c1d10;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.travel-day-tabs__button:hover {
  transform: translateY(-1px);
  border-color: rgba(89, 60, 37, 0.28);
}

.travel-day-tabs__button.is-active {
  border-color: color-mix(in srgb, var(--travel-day-color) 48%, #5b3c25);
  box-shadow: 0 12px 26px rgba(44, 29, 16, 0.08);
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
  color: #7f6956;
}
</style>