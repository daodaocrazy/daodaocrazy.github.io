const mockData = {
  trips: [
    { id: 1, destination: '北京，中国', location: { lat: 39.9042, lng: 116.4074 }, startDate: '2024-04-15', days: 5, description: '首都之旅，感受历史文化与现代都市的完美融合', status: 'completed', highlights: ['故宫', '长城', '天安门', '颐和园'] },
    { id: 2, destination: '成都，中国', location: { lat: 30.5728, lng: 104.0668 }, startDate: '2024-07-20', days: 6, description: '天府之国，熊猫基地与美食天堂', status: 'completed', highlights: ['大熊猫基地', '宽窄巷子', '锦里', '都江堰'] },
    { id: 3, destination: '杭州，中国', location: { lat: 30.2741, lng: 120.1552 }, startDate: '2024-11-01', days: 4, description: '人间天堂，西湖美景与茶文化', status: 'completed', highlights: ['西湖', '灵隐寺', '龙井村', '宋城'] },
    { id: 4, destination: '乌鲁木齐，中国', location: { lat: 43.8256, lng: 87.6168 }, startDate: '2025-06-01', days: 15, description: '环新疆之旅，天山脚下的大美新疆', status: 'planned', highlights: ['天山', '喀纳斯', '吐鲁番', '赛里木湖'] },
    { id: 5, destination: '西安，中国', location: { lat: 34.3416, lng: 108.9398 }, startDate: '2025-09-15', days: 7, description: '千年古都，探索华夏文明的发源地', status: 'planning', highlights: ['兵马俑', '大雁塔', '城墙', '华清池'] }
  ]
};

(function() {
  class TravelManager {
    constructor() {
      this.trips = [];
      this.map = null;
      this.markers = [];
      this.polyline = null;
      this.init();
    }

    init() {
      this.trips = mockData.trips;
      this.renderTripList();
      this.initMap();
      this.setupEventListeners();
    }

    addTrip(tripData) {
      const newTrip = { id: Date.now(), ...tripData, createdAt: new Date().toISOString().split('T')[0] };
      this.trips.push(newTrip);
      this.renderTripList();
      this.updateMap();
      return newTrip;
    }

    updateTrip(id, tripData) {
      const index = this.trips.findIndex(t => t.id === id);
      if (index !== -1) {
        this.trips[index] = { ...this.trips[index], ...tripData };
        this.renderTripList();
        this.updateMap();
      }
    }

    deleteTrip(id) {
      this.trips = this.trips.filter(t => t.id !== id);
      this.renderTripList();
      this.updateMap();
    }

    filterTrips(filter) {
      return filter === 'all' ? this.trips : this.trips.filter(t => t.status === filter);
    }

    searchTrips(query) {
      if (!query) return this.trips;
      const lowerQuery = query.toLowerCase();
      return this.trips.filter(t => 
        t.destination.toLowerCase().includes(lowerQuery) || 
        t.description.toLowerCase().includes(lowerQuery)
      );
    }

    getStatusText(status) {
      const statusMap = { completed: '已完成', planned: '计划中', planning: '规划中' };
      return statusMap[status] || status;
    }

    renderTripList(filter = 'all', searchQuery = '') {
      let filteredTrips = this.filterTrips(filter);
      if (searchQuery) filteredTrips = this.searchTrips(searchQuery);

      const listContainer = document.getElementById('trip-list');
      if (!listContainer) return;

      if (filteredTrips.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>暂无行程记录</p></div>';
        return;
      }

      const sortedTrips = [...filteredTrips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      listContainer.innerHTML = sortedTrips.map((trip, index) => `
        <div class="trip-card ${trip.status}" data-id="${trip.id}">
          <div class="trip-header">
            <h3 class="trip-title">${index + 1}. ${trip.destination}</h3>
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
            <button class="btn btn-edit" onclick="window.travelManager.editTrip(${trip.id})">编辑</button>
            <button class="btn btn-delete" onclick="window.travelManager.confirmDelete(${trip.id})">删除</button>
          </div>
        </div>
      `).join('');
    }

    initMap() {
      if (!window.L) { setTimeout(() => this.initMap(), 100); return; }

      this.map = L.map('map-container').setView([35.0, 105.0], 4);
      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: '1234',
        attribution: '&copy; 高德地图'
      }).addTo(this.map);
      this.updateMap();
    }

    getStatusColor(status) {
      const colorMap = { completed: '#10b981', planned: '#f59e0b', planning: '#6b7280' };
      return colorMap[status] || '#3b82f6';
    }

    updateMap() {
      if (!this.map) return;
      this.markers.forEach(marker => this.map.removeLayer(marker));
      this.markers = [];
      if (this.polyline) { this.map.removeLayer(this.polyline); this.polyline = null; }

      const sortedTrips = [...this.trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      const coordinates = [];

      sortedTrips.forEach((trip, index) => {
        if (trip.location && trip.location.lat && trip.location.lng) {
          coordinates.push([trip.location.lat, trip.location.lng]);
          const iconColor = this.getStatusColor(trip.status);
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width: 30px; height: 30px; border-radius: 50%; background: ${iconColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid white;">${index + 1}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const marker = L.marker([trip.location.lat, trip.location.lng], { icon: customIcon })
            .addTo(this.map)
            .bindPopup(`<strong>${trip.destination}</strong><br>📅 ${trip.startDate} | ${trip.days}天<br><span style="color: ${iconColor}">${this.getStatusText(trip.status)}</span><br><p style="margin-top: 8px; font-size: 12px; opacity: 0.8;">${trip.description}</p>`);
          this.markers.push(marker);
        }
      });

      if (coordinates.length > 1) {
        this.polyline = L.polyline(coordinates, { color: '#3b82f6', weight: 3, opacity: 0.7, dashArray: '5, 10' }).addTo(this.map);
        this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50] });
      } else if (coordinates.length === 1) {
        this.map.setView(coordinates[0], 10);
      }
    }

    showModal(options) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'trip-modal';
      const trip = options.trip || {};

      modal.innerHTML = `
        <div class="modal-content">
          <span class="close-modal" onclick="window.travelManager.closeModal()">&times;</span>
          <h2 class="modal-title">${options.title}</h2>
          <form id="trip-form">
            <div class="form-group"><label>目的地</label><input type="text" id="destination" value="${trip.destination || ''}" required></div>
            <div class="form-group"><label>出发日期</label><input type="date" id="startDate" value="${trip.startDate || ''}" required></div>
            <div class="form-group"><label>天数</label><input type="number" id="days" value="${trip.days || 1}" min="1" required></div>
            <div class="form-group">
              <label>状态</label>
              <select id="status">
                <option value="completed" ${trip.status === 'completed' ? 'selected' : ''}>已完成</option>
                <option value="planned" ${trip.status === 'planned' ? 'selected' : ''}>计划中</option>
                <option value="planning" ${trip.status === 'planning' ? 'selected' : ''}>规划中</option>
              </select>
            </div>
            <div class="form-group"><label>描述</label><textarea id="description">${trip.description || ''}</textarea></div>
            <div class="form-group"><label>亮点（用逗号分隔）</label><input type="text" id="highlights" value="${trip.highlights ? trip.highlights.join(', ') : ''}"></div>
            <div class="btn-group">
              <button type="button" class="btn btn-secondary" onclick="window.travelManager.closeModal()">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);
      const form = document.getElementById('trip-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const highlights = document.getElementById('highlights').value.split(',').map(h => h.trim()).filter(h => h);
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
      modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
    }

    closeModal() { document.getElementById('trip-modal')?.remove(); }

    openAddModal() { this.showModal({ title: '添加新行程', onSubmit: (data) => { this.addTrip(data); this.closeModal(); } }); }

    editTrip(id) {
      const trip = this.trips.find(t => t.id === id);
      if (!trip) return;
      this.showModal({ title: '编辑行程', trip: trip, onSubmit: (data) => { this.updateTrip(id, data); this.closeModal(); } });
    }

    confirmDelete(id) {
      const trip = this.trips.find(t => t.id === id);
      if (!trip) return;
      if (confirm(`确定要删除 "${trip.destination}" 的行程吗？`)) this.deleteTrip(id);
    }

    getLocationFromDestination(destination) {
      const locationMap = {
        '北京': { lat: 39.9042, lng: 116.4074 }, '上海': { lat: 31.2304, lng: 121.4737 },
        '杭州': { lat: 30.2741, lng: 120.1552 }, '成都': { lat: 30.5728, lng: 104.0668 },
        '西安': { lat: 34.3416, lng: 108.9398 }, '乌鲁木齐': { lat: 43.8256, lng: 87.6168 },
        '重庆': { lat: 29.4316, lng: 106.9123 }, '武汉': { lat: 30.5928, lng: 114.3055 },
        '南京': { lat: 32.0603, lng: 118.7969 }, '苏州': { lat: 31.2989, lng: 120.5853 },
        '广州': { lat: 23.1291, lng: 113.2644 }, '深圳': { lat: 22.5431, lng: 114.0579 },
        '厦门': { lat: 24.4798, lng: 118.0894 }, '青岛': { lat: 36.0671, lng: 120.3826 },
        '大连': { lat: 38.9140, lng: 121.6147 }, '哈尔滨': { lat: 45.8038, lng: 126.5340 },
        '长春': { lat: 43.8171, lng: 125.3235 }, '沈阳': { lat: 41.8057, lng: 123.4328 },
        '天津': { lat: 39.3434, lng: 117.3616 }, '石家庄': { lat: 38.0428, lng: 114.5149 },
        '太原': { lat: 37.8706, lng: 112.5489 }, '呼和浩特': { lat: 40.8424, lng: 111.7492 },
        '兰州': { lat: 36.0611, lng: 103.8343 }, '西宁': { lat: 36.6171, lng: 101.7782 },
        '拉萨': { lat: 29.6500, lng: 91.1000 }, '昆明': { lat: 25.0406, lng: 102.7129 },
        '贵阳': { lat: 26.6470, lng: 106.6302 }, '南宁': { lat: 22.8170, lng: 108.3665 },
        '长沙': { lat: 28.2282, lng: 112.9388 }, '郑州': { lat: 34.7466, lng: 113.6253 },
        '济南': { lat: 36.6512, lng: 116.6870 }, '合肥': { lat: 31.8206, lng: 117.2272 },
        '南昌': { lat: 28.6829, lng: 115.8579 }, '福州': { lat: 26.0745, lng: 119.2965 },
        '海口': { lat: 20.0444, lng: 110.1999 }, '三亚': { lat: 18.2528, lng: 109.5117 },
        '香港': { lat: 22.3193, lng: 114.1694 }, '澳门': { lat: 22.1987, lng: 113.5439 },
        '台北': { lat: 25.0330, lng: 121.5654 }, '喀什': { lat: 39.4677, lng: 75.9894 },
        '伊犁': { lat: 43.9219, lng: 81.3240 }, '阿勒泰': { lat: 47.8447, lng: 88.1412 },
        '敦煌': { lat: 40.1421, lng: 94.6620 }, '喀纳斯': { lat: 49.1393, lng: 87.4796 },
        '张家界': { lat: 29.1170, lng: 110.4790 }, '黄山': { lat: 29.7145, lng: 118.3380 },
        '九寨沟': { lat: 33.2626, lng: 103.9128 }, '丽江': { lat: 26.8721, lng: 100.2289 },
        '大理': { lat: 25.6065, lng: 100.2676 }, '桂林': { lat: 25.2736, lng: 110.2906 },
        '凤凰': { lat: 27.9478, lng: 109.5995 }, '苏州': { lat: 31.2989, lng: 120.5853 },
        '乌镇': { lat: 30.7446, lng: 120.4870 }, '周庄': { lat: 31.1164, lng: 120.8438 },
        '平遥': { lat: 37.2069, lng: 112.1539 }, '西安': { lat: 34.3416, lng: 108.9398 },
        '扬州': { lat: 32.3912, lng: 119.4210 }, '洛阳': { lat: 34.6197, lng: 112.4540 },
        '开封': { lat: 34.7972, lng: 114.3075 }, '拉萨': { lat: 29.6500, lng: 91.1000 },
        '大理': { lat: 25.6065, lng: 100.2676 }
      };
      for (const [key, value] of Object.entries(locationMap)) {
        if (destination.includes(key)) return value;
      }
      return { lat: 35.0, lng: 105.0 };
    }

    setupEventListeners() {
      document.getElementById('add-trip-btn')?.addEventListener('click', () => this.openAddModal());
      document.getElementById('search-input')?.addEventListener('input', (e) => {
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
})();
