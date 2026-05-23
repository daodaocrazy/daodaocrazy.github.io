# 🌍 旅游行程管理

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<link rel="stylesheet" href="/travel/travel.css">

<div class="travel-container">
  <div class="travel-sidebar">
    <div class="add-form">
      <h3>✈️ 添加新行程</h3>
      <button id="add-trip-btn" class="btn btn-primary" style="width: 100%;">添加行程</button>
    </div>

    <div>
      <input type="text" id="search-input" class="search-bar" placeholder="搜索目的地..." />
      <div class="filter-tabs">
        <button class="filter-tab active" data-filter="all">全部</button>
        <button class="filter-tab" data-filter="completed">已完成</button>
        <button class="filter-tab" data-filter="planned">计划中</button>
        <button class="filter-tab" data-filter="planning">规划中</button>
      </div>
    </div>

    <div id="trip-list"></div>
  </div>

  <div class="travel-map">
    <div id="map-container" style="height: 100%; width: 100%;"></div>
  </div>
</div>

<script src="/travel/travel.js"></script>

