<script setup>
import { onMounted, ref } from 'vue'

const mapContainer = ref(null)

onMounted(() => {
  if (typeof window !== 'undefined') {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      initTravelApp()
    }
    document.head.appendChild(script)
  }
})

function initTravelApp() {
  const data = [
    { id: 1, destination: '北京', date: '2024-03-15', days: 5, status: 'completed', description: '首都之旅', highlights: ['故宫', '长城', '天安门'], lat: 39.9042, lng: 116.4074 },
    { id: 2, destination: '成都', date: '2024-06-20', days: 4, status: 'completed', description: '熊猫故乡', highlights: ['大熊猫基地', '宽窄巷子', '锦里'], lat: 30.5728, lng: 104.0668 },
    { id: 3, destination: '杭州', date: '2024-09-10', days: 3, status: 'completed', description: '西湖十景', highlights: ['西湖', '灵隐寺', '宋城'], lat: 30.2741, lng: 120.1551 },
    { id: 4, destination: '乌鲁木齐', date: '2025-07-01', days: 10, status: 'planned', description: '环新疆自驾游', highlights: ['天山', '喀纳斯', '吐鲁番'], lat: 43.8256, lng: 87.6168 },
    { id: 5, destination: '西安', date: '2025-10-01', days: 4, status: 'planning', description: '古都探秘', highlights: ['兵马俑', '大雁塔', '城墙'], lat: 34.3416, lng: 108.9398 }
  ]

  let map = null
  let markers = []
  let routeLine = null

  function initMap() {
    if (!mapContainer.value || map) return

    map = L.map(mapContainer.value).setView([35.0, 105.0], 4)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap & CARTO',
      maxZoom: 18
    }).addTo(map)

    updateMap()
  }

  function getMarkerColor(status) {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'planned': return '#f97316'
      case 'planning': return '#94a3b8'
      default: return '#3b82f6'
    }
  }

  function updateMap() {
    markers.forEach(m => map.removeLayer(m))
    markers = []
    if (routeLine) map.removeLayer(routeLine)

    const completedTrips = data.filter(t => t.status === 'completed')
    completedTrips.forEach(trip => {
      const color = getMarkerColor(trip.status)
      const icon = L.divIcon({
        html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [24, 24]
      })

      const marker = L.marker([trip.lat, trip.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${trip.destination}</strong><br>${trip.date}<br>${trip.description}`)

      markers.push(marker)
    })

    if (completedTrips.length > 1) {
      const coords = completedTrips.map(t => [t.lat, t.lng])
      routeLine = L.polyline(coords, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(map)
    }

    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }

  function renderTrips() {
    const list = document.getElementById('trip-list')
    if (!list) return

    list.innerHTML = data.map(trip => `
      <div class="trip-card status-${trip.status}">
        <div class="trip-header">
          <h4>${trip.destination}</h4>
          <span class="trip-status">${trip.status === 'completed' ? '✅' : trip.status === 'planned' ? '📅' : '📝'}</span>
        </div>
        <p class="trip-date">${trip.date} · ${trip.days}天</p>
        <p class="trip-desc">${trip.description}</p>
        <div class="trip-highlights">${trip.highlights.map(h => `<span class="highlight-tag">${h}</span>`).join('')}</div>
      </div>
    `).join('')
  }

  window.initTravelMap = initMap
  window.renderTravelTrips = renderTrips

  setTimeout(() => {
    initMap()
    renderTrips()
  }, 500)
}
</script>

<template>
  <div class="travel-workbench">
    <div class="travel-container">
      <div class="travel-sidebar">
        <div class="add-form">
          <h3>✈️ 添加新行程</h3>
          <p class="add-note">请编辑 <code>public/travel/data.json</code> 添加新行程</p>
        </div>
        <div class="trip-list" id="trip-list"></div>
      </div>
      <div class="travel-map">
        <div ref="mapContainer" id="map-container" style="height: 100%; width: 100%;"></div>
      </div>
    </div>
  </div>
</template>

<style>
.travel-workbench {
  padding: 20px;
  background: var(--vp-c-bg);
}

.travel-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
  min-height: 500px;
}

.travel-sidebar {
  width: 380px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 20px;
  overflow-y: auto;
}

.travel-map {
  flex: 1;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  overflow: hidden;
}

.add-form {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.add-form h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: var(--vp-c-text-1);
}

.add-note {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0;
}

.add-note code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.trip-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trip-card {
  background: var(--vp-c-bg);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid var(--vp-c-brand-1);
}

.trip-card.status-completed { border-left-color: #22c55e; }
.trip-card.status-planned { border-left-color: #f97316; }
.trip-card.status-planning { border-left-color: #94a3b8; }

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trip-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.trip-date {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 8px 0;
}

.trip-desc {
  font-size: 14px;
  color: var(--vp-c-text-1);
  margin: 0 0 10px 0;
}

.trip-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.highlight-tag {
  background: var(--vp-c-bg-soft);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.custom-marker {
  background: transparent !important;
  border: none !important;
}
</style>
