class TravelManager {
  constructor() {
    this.trips = [];
    this.map = null;
    this.markers = [];
    this.polyline = null;
    this.init();
  }

  async init() {
    await this.loadTrips();
    this.renderTripList();
    this.initMap();
    this.setupEventListeners();
  }

  async loadTrips() {
    try {
      const response = await fetch('/travel/data.json');
      const data = await response.json();
      this.trips = data.trips || [];
    } catch (error) {
      console.error('Failed to load trips:', error);
      this.trips = [];
    }
  }

  async saveTrips() {
    console.log('Trips saved locally:', this.trips);
    this.renderTripList();
    this.updateMap();
  }

  addTrip(tripData) {
    const newTrip = {
      id: Date.now(),
      ...tripData,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.trips.push(newTrip);
    this.saveTrips();
    return newTrip;
  }

  updateTrip(id, tripData) {
    const index = this.trips.findIndex(t => t.id === id);
    if (index !== -1) {
      this.trips[index] = { ...this.trips[index], ...tripData };
      this.saveTrips();
    }
  }

  deleteTrip(id) {
    this.trips = this.trips.filter(t => t.id !== id);
    this.saveTrips();
  }

  filterTrips(filter) {
    if (filter === 'all') return this.trips;
    return this.trips.filter(t => t.status === filter);
  }

  searchTrips(query) {
    if (!query) return this.trips;
    const lowerQuery = query.toLowerCase();
    return this.trips.filter(t => 
      t.destination.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
    );
  }

  renderTripList(filter = 'all', searchQuery = '') {
    let filteredTrips = this.filterTrips(filter);
    if (searchQuery) {
      filteredTrips = this.searchTrips(searchQuery);
    }

    const listContainer = document.getElementById('trip-list');
    if (!listContainer) return;

    if (filteredTrips.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 6h22M5 6V4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2M1 6v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6"/>
            <path d="M9 10l2 2 4-4"/>
          </svg>
          <p>暂无行程记录</p>
        </div>
      `;
      return;
    }

    const sortedTrips = [...filteredTrips].sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );

    listContainer.innerHTML = sortedTrips.map(trip => `
      <div class="trip-card ${trip.status}" data-id="${trip.id}">
        <div class="trip-header">
          <h3 class="trip-title">${trip.destination}</h3>
          <span class="trip-status status-${trip.status}">${this.getStatusText(trip.status)}</span>
        </div>
        <div class="trip-meta">
          <span>📅 ${trip.startDate}</span>
          <span>🏷️ ${trip.days}天</span>
        </div>
        <p class="trip-description">${trip.description}</p>
        <div class="trip-highlights">
          ${trip.highlights.slice(0, 3).map(h => `<span class="highlight-tag">${h}</span>`).join('')}
          ${trip.highlights.length > 3 ? `<span class="highlight-tag">+${trip.highlights.length - 3}</span>` : ''}
        </div>
        <div class="trip-actions">
          <button class="btn btn-edit" onclick="travelManager.editTrip(${trip.id})">编辑</button>
          <button class="btn btn-delete" onclick="travelManager.confirmDelete(${trip.id})">删除</button>
        </div>
      </div>
    `).join('');
  }

  getStatusText(status) {
    const statusMap = {
      'completed': '已完成',
      'planned': '计划中',
      'planning': '规划中'
    };
    return statusMap[status] || status;
  }

  initMap() {
    if (!window.L) {
      setTimeout(() => this.initMap(), 100);
      return;
    }

    this.map = L.map('map-container').setView([35.0, 100.0], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateMap();
  }

  updateMap() {
    if (!this.map) return;

    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    const sortedTrips = [...this.trips].sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );

    const coordinates = [];

    sortedTrips.forEach((trip, index) => {
      if (trip.location && trip.location.lat && trip.location.lng) {
        coordinates.push([trip.location.lat, trip.location.lng]);

        const iconColor = this.getStatusColor(trip.status);
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${iconColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid white;">
              ${index + 1}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([trip.location.lat, trip.location.lng], { icon: customIcon })
          .addTo(this.map)
          .bindPopup(`
            <strong>${trip.destination}</strong><br>
            📅 ${trip.startDate} | ${trip.days}天<br>
            <span style="color: ${iconColor}">${this.getStatusText(trip.status)}</span><br>
            <p style="margin-top: 8px; font-size: 12px; opacity: 0.8;">${trip.description}</p>
          `);

        this.markers.push(marker);
      }
    });

    if (coordinates.length > 1) {
      this.polyline = L.polyline(coordinates, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 10'
      }).addTo(this.map);

      this.map.fitBounds(this.polyline.getBounds());
    } else if (coordinates.length === 1) {
      this.map.setView(coordinates[0], 10);
    }
  }

  getStatusColor(status) {
    const colorMap = {
      'completed': '#10b981',
      'planned': '#f59e0b',
      'planning': '#6b7280'
    };
    return colorMap[status] || '#3b82f6';
  }

  openAddModal() {
    this.showModal({
      title: '添加新行程',
      onSubmit: (data) => {
        this.addTrip(data);
        this.closeModal();
      }
    });
  }

  editTrip(id) {
    const trip = this.trips.find(t => t.id === id);
    if (!trip) return;

    this.showModal({
      title: '编辑行程',
      trip: trip,
      onSubmit: (data) => {
        this.updateTrip(id, data);
        this.closeModal();
      }
    });
  }

  confirmDelete(id) {
    const trip = this.trips.find(t => t.id === id);
    if (!trip) return;

    if (confirm(`确定要删除 "${trip.destination}" 的行程吗？`)) {
      this.deleteTrip(id);
    }
  }

  showModal(options) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'trip-modal';
    
    const trip = options.trip || {};
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal" onclick="travelManager.closeModal()">&times;</span>
        <h2 class="modal-title">${options.title}</h2>
        <form id="trip-form">
          <div class="form-group">
            <label>目的地</label>
            <input type="text" id="destination" value="${trip.destination || ''}" required>
          </div>
          <div class="form-group">
            <label>出发日期</label>
            <input type="date" id="startDate" value="${trip.startDate || ''}" required>
          </div>
          <div class="form-group">
            <label>天数</label>
            <input type="number" id="days" value="${trip.days || 1}" min="1" required>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select id="status">
              <option value="completed" ${trip.status === 'completed' ? 'selected' : ''}>已完成</option>
              <option value="planned" ${trip.status === 'planned' ? 'selected' : ''}>计划中</option>
              <option value="planning" ${trip.status === 'planning' ? 'selected' : ''}>规划中</option>
            </select>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea id="description">${trip.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>亮点（用逗号分隔）</label>
            <input type="text" id="highlights" value="${trip.highlights ? trip.highlights.join(', ') : ''}">
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary" onclick="travelManager.closeModal()">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('trip-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const highlights = document.getElementById('highlights').value
        .split(',').map(h => h.trim()).filter(h => h);
      
      options.onSubmit({
        destination: document.getElementById('destination').value,
        startDate: document.getElementById('startDate').value,
        days: parseInt(document.getElementById('days').value),
        status: document.getElementById('status').value,
        description: document.getElementById('description').value,
        highlights: highlights,
        location: this.getLocationFromDestination(document.getElementById('destination').value)
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    const modal = document.getElementById('trip-modal');
    if (modal) {
      modal.remove();
    }
  }

  getLocationFromDestination(destination) {
    const locationMap = {
      '京都': { lat: 35.0116, lng: 135.7681 },
      '东京': { lat: 35.6762, lng: 139.6503 },
      '巴厘岛': { lat: -8.3405, lng: 115.0920 },
      '巴黎': { lat: 48.8566, lng: 2.3522 },
      '纽约': { lat: 40.7128, lng: -74.0060 },
      '北京': { lat: 39.9042, lng: 116.4074 },
      '上海': { lat: 31.2304, lng: 121.4737 },
      '杭州': { lat: 30.2741, lng: 120.1552 },
      '伦敦': { lat: 51.5074, lng: -0.1278 },
      '悉尼': { lat: -33.8688, lng: 151.2093 },
      '新加坡': { lat: 1.3521, lng: 103.8198 },
      '曼谷': { lat: 13.7563, lng: 100.5018 }
    };

    for (const [key, value] of Object.entries(locationMap)) {
      if (destination.includes(key)) {
        return value;
      }
    }

    return { lat: 35.0, lng: 100.0 };
  }

  setupEventListeners() {
    document.getElementById('add-trip-btn')?.addEventListener('click', () => {
      this.openAddModal();
    });

    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('input', (e) => {
      const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
      this.renderTripList(activeFilter, e.target.value);
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const searchQuery = document.getElementById('search-input')?.value || '';
        this.renderTripList(e.target.dataset.filter, searchQuery);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.travelManager = new TravelManager();
});
