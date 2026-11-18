<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useData } from 'vitepress'

import {
  formatTravelDistance,
  formatTravelDuration,
  formatTravelMode
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

const { isDark } = useData()

const mapContainer = ref(null)
const interactionEnabled = ref(false)
const mapReady = ref(false)
const tileStatus = ref('loading')

const leaflet = shallowRef(null)
const map = shallowRef(null)
const layerGroup = shallowRef(null)
const markerRegistry = new Map()
const polylineRegistry = new Map()

let resizeObserver = null
let tileLoadCount = 0
let tileErrorCount = 0

const selectedDay = computed(() => props.viewModel.days.find((day) => day.dayNumber === props.selectedDayNumber) ?? props.viewModel.days[0] ?? null)
const selectedStop = computed(() => props.viewModel.allStops.find((stop) => stop.id === props.selectedStopId) ?? null)
const selectedSegment = computed(() => props.viewModel.allSegments.find((segment) => segment.id === props.selectedSegmentId) ?? null)

const activeStopIds = computed(() => new Set(selectedDay.value?.stops.map((stop) => stop.id) ?? []))
const activeSegmentIds = computed(() => new Set(selectedDay.value?.segments.map((segment) => segment.id) ?? []))

const stopTypeLabels = {
  transport_hub: '交通枢纽',
  sightseeing: '景点',
  food: '餐饮',
  stay: '住宿',
  shopping: '购物',
  nature: '自然景观'
}

function formatStopType(type) {
  return stopTypeLabels[type] ?? type
}

const callout = computed(() => {
  if (selectedStop.value) {
    return {
      eyebrow: `Day ${selectedStop.value.dayNumber} · 站点`,
      title: selectedStop.value.name,
      meta: `${formatStopType(selectedStop.value.type)} · ${selectedStop.value.arrivalTime} - ${selectedStop.value.departureTime} · 停留 ${formatTravelDuration(selectedStop.value.stayMinutes)}`,
      body: selectedStop.value.note
    }
  }

  if (selectedSegment.value) {
    const fromStop = props.viewModel.allStops.find((stop) => stop.id === selectedSegment.value.fromStopId)
    const toStop = props.viewModel.allStops.find((stop) => stop.id === selectedSegment.value.toStopId)

    return {
      eyebrow: `Day ${selectedSegment.value.dayNumber} · 移动`,
      title: `${fromStop?.name ?? '起点'} → ${toStop?.name ?? '终点'}`,
      meta: `${formatTravelMode(selectedSegment.value.mode)} · ${formatTravelDistance(selectedSegment.value.distanceMeters)} · ${formatTravelDuration(selectedSegment.value.durationMinutes)}`,
      body: selectedSegment.value.summary
    }
  }

  return selectedDay.value
    ? {
        eyebrow: `Day ${selectedDay.value.dayNumber}`,
        title: selectedDay.value.title,
        meta: `${selectedDay.value.stops.length} 个站点 · ${selectedDay.value.segments.length} 段移动 · ${selectedDay.value.date}`,
        body: selectedDay.value.summary
      }
    : null
})

const dayColors = computed(() => new Map(props.viewModel.days.map((day) => [day.dayNumber, day.color])))

function dayColor(dayNumber) {
  return dayColors.value.get(dayNumber) ?? 'var(--travel-accent)'
}

function isStopActive(stop) {
  if (props.selectedStopId) {
    return stop.id === props.selectedStopId
  }

  return activeStopIds.value.has(stop.id)
}

function isSegmentActive(segment) {
  if (props.selectedSegmentId) {
    return segment.id === props.selectedSegmentId
  }

  return activeSegmentIds.value.has(segment.id)
}

function shouldShowStopLabel(stop) {
  return isStopActive(stop) || activeStopIds.value.has(stop.id)
}

const LABEL_HEIGHT = 24
const LABEL_GAP = 6

function estimateLabelWidth(text) {
  let width = 16

  for (const char of String(text)) {
    width += /[\u2e80-\u9fff\uff00-\uffef]/.test(char) ? 12.5 : 7.2
  }

  return width
}

function labelBox(point, slot, width) {
  const cy = point.y
  const cx = point.x

  switch (slot) {
    case 'left':
      return { left: cx - LABEL_GAP - width, top: cy - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT }
    case 'top':
      return { left: cx - width / 2, top: cy - LABEL_GAP - LABEL_HEIGHT, width, height: LABEL_HEIGHT }
    case 'bottom':
      return { left: cx - width / 2, top: cy + LABEL_GAP, width, height: LABEL_HEIGHT }
    case 'right':
    default:
      return { left: cx + LABEL_GAP, top: cy - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT }
  }
}

function boxesOverlap(left, right) {
  return !(
    left.left + left.width + 4 < right.left
    || right.left + right.width + 4 < left.left
    || left.top + left.height + 4 < right.top
    || right.top + right.height + 4 < left.top
  )
}

function layoutLabels() {
  if (!map.value) {
    return
  }

  const candidates = props.viewModel.allStops
    .filter((stop) => shouldShowStopLabel(stop))
    .map((stop) => ({
      stop,
      point: map.value.latLngToLayerPoint(toLatLng(stop.coordinates)),
      width: estimateLabelWidth(stop.name)
    }))
    .sort((left, right) => {
      const leftPriority = left.stop.id === props.selectedStopId ? 0 : 1
      const rightPriority = right.stop.id === props.selectedStopId ? 0 : 1
      return leftPriority - rightPriority
    })

  const placed = []
  const slotOrder = ['right', 'left', 'top', 'bottom']

  for (const candidate of candidates) {
    let chosenSlot = 'right'
    let chosenBox = labelBox(candidate.point, chosenSlot, candidate.width)

    for (const slot of slotOrder) {
      const box = labelBox(candidate.point, slot, candidate.width)

      if (!placed.some((other) => boxesOverlap(box, other))) {
        chosenSlot = slot
        chosenBox = box
        break
      }
    }

    placed.push(chosenBox)

    const element = markerRegistry.get(candidate.stop.id)?.marker.getElement()

    if (element) {
      element.dataset.labelSlot = chosenSlot
      element.style.setProperty('--travel-map-label-x', `${Math.round(chosenBox.left - candidate.point.x)}px`)
      element.style.setProperty('--travel-map-label-y', `${Math.round(chosenBox.top - candidate.point.y)}px`)
    }
  }
}

function toLatLng(coordinate) {
  return [coordinate[1], coordinate[0]]
}

function boundsToLeaflet(bounds, L) {
  return L.latLngBounds(
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng]
  )
}

function computeFocusBounds() {
  const day = selectedDay.value

  if (!day || day.stops.length === 0) {
    return props.viewModel.bounds
  }

  const coordinates = [
    ...day.stops.map((stop) => stop.coordinates),
    ...day.segments.flatMap((segment) => segment.routeGeometry.coordinates ?? [])
  ]

  if (coordinates.length === 0) {
    return props.viewModel.bounds
  }

  let minLng = Number.POSITIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng)
    minLat = Math.min(minLat, lat)
    maxLng = Math.max(maxLng, lng)
    maxLat = Math.max(maxLat, lat)
  }

  // 单点或近似单点的当天，需要一个最小的取景跨度，否则会被拉到最大缩放。
  const minimumSpan = 0.06

  if (maxLng - minLng < minimumSpan) {
    const center = (minLng + maxLng) / 2
    minLng = center - minimumSpan / 2
    maxLng = center + minimumSpan / 2
  }

  if (maxLat - minLat < minimumSpan) {
    const center = (minLat + maxLat) / 2
    minLat = center - minimumSpan / 2
    maxLat = center + minimumSpan / 2
  }

  return { minLng, minLat, maxLng, maxLat }
}

function fitToBounds(bounds, options = {}) {
  if (!map.value || !leaflet.value || !bounds) {
    return
  }

  map.value.fitBounds(boundsToLeaflet(bounds, leaflet.value), {
    padding: [48, 48],
    animate: options.animate !== false,
    maxZoom: 13
  })
}

function buildMarker(stop) {
  const L = leaflet.value
  const active = shouldShowStopLabel(stop)
  const icon = L.divIcon({
    className: 'travel-map-marker',
    html: `<span class="travel-map-marker__dot"></span><span class="travel-map-marker__label">${escapeHtml(stop.name)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  })
  const marker = L.marker(toLatLng(stop.coordinates), {
    icon,
    keyboard: false,
    title: stop.name,
    riseOnHover: true
  })

  marker.on('click', () => emit('select-stop', stop.id))
  marker.on('mouseover', () => {
    const element = marker.getElement()
    element?.classList.add('is-hovered')
  })
  marker.on('mouseout', () => {
    const element = marker.getElement()
    element?.classList.remove('is-hovered')
  })

  markerRegistry.set(stop.id, { marker, stop, layer: marker })

  return { marker, active }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPolyline(segment) {
  const L = leaflet.value
  const coordinates = segment.routeGeometry?.coordinates ?? []

  if (coordinates.length < 2) {
    return null
  }

  const polyline = L.polyline(coordinates.map(toLatLng), {
    color: dayColor(segment.dayNumber),
    weight: 4,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
    className: 'travel-map-line'
  })

  polyline.on('click', () => emit('select-segment', segment.id))

  polylineRegistry.set(segment.id, { polyline, segment, layer: polyline })

  return polyline
}

function renderLayers() {
  if (!map.value || !leaflet.value || !layerGroup.value) {
    return
  }

  layerGroup.value.clearLayers()
  markerRegistry.clear()
  polylineRegistry.clear()

  const lines = []

  for (const segment of props.viewModel.allSegments) {
    const polyline = buildPolyline(segment)

    if (polyline) {
      lines.push(polyline)
    }
  }

  for (const stop of props.viewModel.allStops) {
    const { marker } = buildMarker(stop)
    marker.addTo(layerGroup.value)
  }

  for (const polyline of lines) {
    polyline.addTo(layerGroup.value)
  }

  applyStyles()
}

function applyStyles() {
  for (const { marker, stop } of markerRegistry.values()) {
    const highlighted = isStopActive(stop)
    const inActiveDay = activeStopIds.value.has(stop.id)
    const element = marker.getElement()

    marker.setZIndexOffset(highlighted ? 1000 : inActiveDay ? 500 : 0)

    if (!element) {
      continue
    }

    element.classList.toggle('is-highlighted', highlighted)
    element.classList.toggle('is-dimmed', !inActiveDay && !highlighted)
    element.classList.toggle('is-revealed', shouldShowStopLabel(stop))
    element.style.setProperty('--travel-map-marker-color', dayColor(stop.dayNumber))
  }

  for (const { polyline, segment } of polylineRegistry.values()) {
    const highlighted = isSegmentActive(segment)
    const inActiveDay = activeSegmentIds.value.has(segment.id)

    polyline.setStyle({
      weight: highlighted ? 7 : 4,
      opacity: highlighted ? 1 : inActiveDay ? 0.86 : 0.24,
      dashArray: segment.mode === 'walk' ? '2 9' : null
    })
    polyline.bringToFront()
  }

  layoutLabels()
}

function focusSelection() {
  if (!map.value || !selectedStop.value) {
    return
  }

  map.value.panTo(toLatLng(selectedStop.value.coordinates), { animate: true })
}

async function mountMap() {
  if (map.value || !mapContainer.value) {
    return
  }

  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  leaflet.value = L

  map.value = L.map(mapContainer.value, {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: true,
    minZoom: 2,
    worldCopyJump: true
  })

  L.control.zoom({ position: 'topright' }).addTo(map.value)
  L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 160 }).addTo(map.value)

  map.value.attributionControl.setPrefix('')

  const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 贡献者'
  })

  tileLayer.on('tileload', () => {
    tileLoadCount += 1
    tileStatus.value = 'ready'
  })

  tileLayer.on('tileerror', () => {
    tileErrorCount += 1

    if (tileErrorCount >= 4 && tileLoadCount === 0) {
      tileStatus.value = 'unavailable'
    }
  })

  tileLayer.addTo(map.value)
  layerGroup.value = L.layerGroup().addTo(map.value)

  mapContainer.value.addEventListener('click', enableInteraction, { once: true })
  mapContainer.value.addEventListener('focusin', enableInteraction, { once: true })

  // 必须先确定视图，Leaflet 才会真正把图层挂到 DOM 上（否则 whenReady 会排队）。
  fitToBounds(computeFocusBounds(), { animate: false })
  renderLayers()
  mapReady.value = true

  map.value.on('zoomend moveend', () => {
    layoutLabels()
  })

  resizeObserver = new ResizeObserver(() => {
    map.value?.invalidateSize({ animate: false })
  })
  resizeObserver.observe(mapContainer.value)
}

function enableInteraction() {
  interactionEnabled.value = true

  if (map.value) {
    map.value.scrollWheelZoom.enable()
  }
}

onMounted(() => {
  mountMap().catch(() => {
    tileStatus.value = 'unavailable'
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  mapContainer.value?.removeEventListener('click', enableInteraction)
  mapContainer.value?.removeEventListener('focusin', enableInteraction)
  markerRegistry.clear()
  polylineRegistry.clear()
  map.value?.remove()
  map.value = null
  layerGroup.value = null
})

watch(() => props.viewModel, () => {
  renderLayers()
  fitToBounds(props.viewModel.bounds)
}, { deep: false })

watch(() => [props.selectedStopId, props.selectedSegmentId, props.selectedDayNumber], () => {
  applyStyles()
})

watch(() => props.selectedDayNumber, () => {
  nextTick(() => {
    fitToBounds(computeFocusBounds())
  })
}, { immediate: false })

watch(() => props.selectedStopId, (nextId, previousId) => {
  if (nextId && nextId !== previousId) {
    focusSelection()
  }
})

watch(isDark, () => {
  map.value?.invalidateSize({ animate: false })
})
</script>

<template>
  <section class="travel-map-panel">
    <div class="travel-map-panel__frame">
      <div ref="mapContainer" class="travel-map-panel__canvas" role="application" aria-label="旅行路线地图">
        <p v-if="!mapReady" class="travel-map-panel__loading">正在加载地图…</p>
      </div>

      <div class="travel-map-panel__overlay-stack">
        <div class="travel-map-panel__hud">
          <p class="travel-map-panel__hud-day">{{ selectedDay ? `Day ${selectedDay.dayNumber}` : '全程' }}</p>
          <p class="travel-map-panel__hud-title">{{ selectedDay ? selectedDay.title : viewModel.trip.title }}</p>
        </div>

        <p v-if="tileStatus === 'unavailable'" class="travel-map-panel__offline">
          底图瓦片未加载，路线仍按真实经纬度绘制
        </p>
      </div>

      <p v-if="!interactionEnabled" class="travel-map-panel__hint">点击地图后可用滚轮缩放</p>
    </div>

    <footer v-if="callout" class="travel-map-panel__callout">
      <p class="travel-map-panel__callout-eyebrow">{{ callout.eyebrow }}</p>
      <div class="travel-map-panel__callout-body">
        <h3>{{ callout.title }}</h3>
        <p class="travel-map-panel__callout-meta">{{ callout.meta }}</p>
        <p class="travel-map-panel__callout-text">{{ callout.body }}</p>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.travel-map-panel {
  display: grid;
  gap: 14px;
}

.travel-map-panel__frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--travel-line);
  border-radius: 24px;
  background: linear-gradient(135deg, var(--travel-surface) 0%, var(--travel-surface-alt) 100%);
}

.travel-map-panel__canvas {
  position: relative;
  z-index: 1;
  width: 100%;
  height: clamp(320px, 46vh, 520px);
  background: var(--travel-map-canvas-bg);
}

.travel-map-panel__loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  margin: 0;
  transform: translate(-50%, -50%);
  color: var(--travel-soft);
  font-size: 13px;
}

.travel-map-panel__overlay-stack {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: min(300px, calc(100% - 120px));
  pointer-events: none;
}

.travel-map-panel__hud {
  padding: 10px 14px;
  border: 1px solid var(--travel-line);
  border-radius: 16px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 92%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: var(--travel-shadow);
}

.travel-map-panel__hud-day,
.travel-map-panel__hud-title {
  margin: 0;
}

.travel-map-panel__hud-day {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-map-panel__hud-title {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--travel-ink);
}

.travel-map-panel__hint {
  position: absolute;
  z-index: 500;
  margin: 0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  bottom: 42px;
  left: 50%;
  transform: translateX(-50%);
  padding: 7px 14px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 92%, transparent);
  border: 1px solid var(--travel-line);
  color: var(--travel-muted);
  white-space: nowrap;
}

.travel-map-panel__offline {
  margin: 0;
  padding: 7px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 92%, transparent);
  border: 1px solid var(--travel-line);
  color: var(--travel-warn);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.travel-map-panel__callout {
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--travel-line);
  border-radius: 20px;
  background: var(--travel-surface);
}

.travel-map-panel__callout-eyebrow {
  flex: none;
  margin: 0;
  padding-top: 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--travel-accent);
}

.travel-map-panel__callout-body {
  min-width: 0;
}

.travel-map-panel__callout h3,
.travel-map-panel__callout p {
  margin: 0;
}

.travel-map-panel__callout h3 {
  font-size: 17px;
  line-height: 1.3;
  color: var(--travel-ink);
}

.travel-map-panel__callout-meta {
  margin-top: 4px !important;
  font-size: 13px;
  color: var(--travel-soft);
}

.travel-map-panel__callout-text {
  margin-top: 8px !important;
  line-height: 1.68;
  color: var(--travel-muted);
}

@media (max-width: 768px) {
  .travel-map-panel__canvas {
    height: clamp(280px, 52vh, 420px);
  }

  .travel-map-panel__callout {
    flex-direction: column;
    gap: 8px;
  }
}
</style>

<style>
.travel-map-panel__canvas .leaflet-container {
  width: 100%;
  height: 100%;
  background-color: var(--travel-map-canvas-bg);
  background-image:
    linear-gradient(var(--travel-map-canvas-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--travel-map-canvas-grid) 1px, transparent 1px);
  background-size: 44px 44px, 44px 44px;
  font-family: inherit;
}

.travel-map-panel__canvas .leaflet-tile-pane {
  filter: var(--travel-map-tile-filter);
}

.travel-map-panel__canvas .leaflet-control-zoom a {
  border-radius: 10px;
  border-color: var(--travel-line);
  background: var(--travel-surface-elevated);
  color: var(--travel-ink);
}

.travel-map-panel__canvas .leaflet-control-zoom a:hover {
  background: var(--travel-surface-alt);
  color: var(--travel-ink);
}

.travel-map-panel__canvas .leaflet-bar {
  border: 1px solid var(--travel-line);
  border-radius: 12px;
  box-shadow: var(--travel-shadow);
  overflow: hidden;
}

.travel-map-panel__canvas .leaflet-control-scale-line {
  border: 1px solid var(--travel-line);
  border-top: none;
  border-radius: 0 0 8px 8px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 88%, transparent);
  color: var(--travel-muted);
  font-size: 11px;
  font-weight: 600;
}

.travel-map-panel__canvas .leaflet-control-attribution {
  margin: 0 8px 6px 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 86%, transparent);
  color: var(--travel-soft);
  font-size: 10px;
  white-space: nowrap;
  line-height: 1.4;
}

.travel-map-panel__canvas .leaflet-control-attribution a {
  color: var(--travel-muted);
}

.travel-map-panel__canvas .leaflet-control-attribution svg {
  display: none;
}

.travel-map-panel__canvas .travel-map-line {
  cursor: pointer;
}

.travel-map-marker {
  position: relative;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  background: none;
  border: none;
}

.travel-map-marker__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 15px;
  margin: -7.5px 0 0 -7.5px;
  border-radius: 50%;
  border: 2.5px solid var(--travel-map-marker-ring);
  background: var(--travel-map-marker-color, var(--travel-accent));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.travel-map-marker__label {
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--travel-surface-elevated) 92%, transparent);
  border: 1px solid var(--travel-line);
  color: var(--travel-ink);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  transform: translate(var(--travel-map-label-x, 6px), var(--travel-map-label-y, -12px)) translateY(2px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: none;
}

.travel-map-marker.is-revealed .travel-map-marker__label,
.travel-map-marker.is-hovered .travel-map-marker__label {
  opacity: 1;
  transform: translate(var(--travel-map-label-x, 6px), var(--travel-map-label-y, -12px));
}

.travel-map-marker.is-dimmed .travel-map-marker__dot {
  opacity: 0.4;
  transform: scale(0.78);
}

.travel-map-marker.is-highlighted .travel-map-marker__dot {
  transform: scale(1.35);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--travel-map-marker-color) 26%, transparent), 0 2px 10px rgba(15, 23, 42, 0.32);
}
</style>
