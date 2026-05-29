<script setup>
import { formatTravelDuration } from '../../utils/travel-memory-view-model.mjs'

defineProps({
  stop: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <article class="travel-stop-card">
    <p class="travel-stop-card__eyebrow">Stop Note</p>
    <h2>{{ stop.name }}</h2>
    <dl>
      <div>
        <dt>类型</dt>
        <dd>{{ stop.type }}</dd>
      </div>
      <div>
        <dt>到达 / 离开</dt>
        <dd>{{ stop.arrivalTime }} / {{ stop.departureTime }}</dd>
      </div>
      <div>
        <dt>停留</dt>
        <dd>{{ formatTravelDuration(stop.stayMinutes) }}</dd>
      </div>
    </dl>
    <p>{{ stop.note }}</p>
  </article>
</template>

<style scoped>
.travel-stop-card {
  padding: 22px;
  border: 1px solid var(--travel-line);
  border-radius: 24px;
  background: linear-gradient(180deg, var(--travel-surface-elevated), var(--travel-surface-alt));
  color: var(--travel-ink);
}

.travel-stop-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-stop-card h2,
.travel-stop-card p,
.travel-stop-card dl {
  margin: 0;
}

.travel-stop-card dl {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.travel-stop-card dl div {
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--travel-line);
}

.travel-stop-card dt {
  font-size: 12px;
  color: var(--travel-soft);
}

.travel-stop-card dd {
  margin: 6px 0 0;
  color: var(--travel-ink);
}

.travel-stop-card p:last-child {
  margin-top: 16px;
  line-height: 1.72;
  color: var(--travel-muted);
}
</style>