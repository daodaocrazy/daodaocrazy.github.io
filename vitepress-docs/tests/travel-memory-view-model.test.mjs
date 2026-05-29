import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildTravelTripViewModel,
  collectTravelFilterOptions,
  filterTravelIndexEntries,
  projectTravelLineToViewport
} from '../docs/.vitepress/theme/utils/travel-memory-view-model.mjs'

const tripFixture = {
  trip: {
    id: 'kyoto-2026-spring',
    slug: 'kyoto-2026-spring',
    title: '关西樱花 2 日',
    startDate: '2026-04-05',
    endDate: '2026-04-06',
    daysCount: 2,
    region: '日本',
    places: ['京都', '宇治', '大阪'],
    tags: ['城市漫游', '电车', '樱花季'],
    coverImage: '/travel/kyoto-2026-spring/cover.jpg',
    summary: '从京都东山步行到宇治，再转到大阪入住的两日春季路线。',
    intro: '这次路线以京都和宇治为主。',
    status: 'published',
    publishedAt: '2026-04-20',
    routePreview: {
      bbox: [135.5, 34.67, 135.82, 34.99],
      center: [135.67, 34.84],
      line: {
        type: 'LineString',
        coordinates: [
          [135.7587, 34.9855],
          [135.785, 34.9949],
          [135.8077, 34.8895],
          [135.4959, 34.7025]
        ]
      }
    }
  },
  days: [
    {
      dayNumber: 1,
      date: '2026-04-05',
      title: '京都东山步行日',
      summary: '第一天步行线路。',
      color: '#D96C6C',
      stopIds: ['stop-kyoto-station', 'stop-kiyomizu', 'stop-gion'],
      segmentIds: ['seg-kyoto-to-kiyomizu', 'seg-kiyomizu-to-gion']
    },
    {
      dayNumber: 2,
      date: '2026-04-06',
      title: '宇治半日与大阪入住',
      summary: '第二天跨城衔接。',
      color: '#5C8D89',
      stopIds: ['stop-kyoto-station-day2', 'stop-uji', 'stop-osaka-station'],
      segmentIds: ['seg-kyoto-to-uji', 'seg-uji-to-osaka']
    }
  ],
  stops: [
    {
      id: 'stop-kyoto-station',
      dayNumber: 1,
      order: 1,
      name: '京都站',
      type: 'transport_hub',
      coordinates: [135.7587, 34.9855],
      arrivalTime: '09:10',
      departureTime: '09:45',
      stayMinutes: 35,
      note: '寄存行李。'
    },
    {
      id: 'stop-kiyomizu',
      dayNumber: 1,
      order: 2,
      name: '清水寺',
      type: 'sightseeing',
      coordinates: [135.785, 34.9949],
      arrivalTime: '10:20',
      departureTime: '12:00',
      stayMinutes: 100,
      note: '上午适合拍照。'
    },
    {
      id: 'stop-gion',
      dayNumber: 1,
      order: 3,
      name: '祇园',
      type: 'sightseeing',
      coordinates: [135.7765, 35.0037],
      arrivalTime: '12:25',
      departureTime: '15:30',
      stayMinutes: 185,
      note: '慢走和吃饭。'
    },
    {
      id: 'stop-kyoto-station-day2',
      dayNumber: 2,
      order: 1,
      name: '京都站',
      type: 'transport_hub',
      coordinates: [135.7587, 34.9855],
      arrivalTime: '08:30',
      departureTime: '09:00',
      stayMinutes: 30,
      note: '换乘 JR。'
    },
    {
      id: 'stop-uji',
      dayNumber: 2,
      order: 2,
      name: '宇治站',
      type: 'sightseeing',
      coordinates: [135.8077, 34.8895],
      arrivalTime: '09:25',
      departureTime: '13:20',
      stayMinutes: 235,
      note: '半日轻松停留。'
    },
    {
      id: 'stop-osaka-station',
      dayNumber: 2,
      order: 3,
      name: '大阪站',
      type: 'hotel',
      coordinates: [135.4959, 34.7025],
      arrivalTime: '14:30',
      departureTime: '18:00',
      stayMinutes: 210,
      note: '晚上入住。'
    }
  ],
  segments: [
    {
      id: 'seg-kyoto-to-kiyomizu',
      dayNumber: 1,
      order: 1,
      fromStopId: 'stop-kyoto-station',
      toStopId: 'stop-kiyomizu',
      mode: 'bus_walk',
      distanceMeters: 3600,
      durationMinutes: 35,
      summary: '公交加步行。',
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [135.7587, 34.9855],
          [135.7718, 34.989],
          [135.785, 34.9949]
        ]
      }
    },
    {
      id: 'seg-kiyomizu-to-gion',
      dayNumber: 1,
      order: 2,
      fromStopId: 'stop-kiyomizu',
      toStopId: 'stop-gion',
      mode: 'walk',
      distanceMeters: 1800,
      durationMinutes: 25,
      summary: '步行进入祇园。',
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [135.785, 34.9949],
          [135.7812, 34.999],
          [135.7765, 35.0037]
        ]
      }
    },
    {
      id: 'seg-kyoto-to-uji',
      dayNumber: 2,
      order: 1,
      fromStopId: 'stop-kyoto-station-day2',
      toStopId: 'stop-uji',
      mode: 'train',
      distanceMeters: 16000,
      durationMinutes: 25,
      summary: 'JR 奈良线。',
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [135.7587, 34.9855],
          [135.7814, 34.9424],
          [135.8077, 34.8895]
        ]
      }
    },
    {
      id: 'seg-uji-to-osaka',
      dayNumber: 2,
      order: 2,
      fromStopId: 'stop-uji',
      toStopId: 'stop-osaka-station',
      mode: 'train',
      distanceMeters: 43000,
      durationMinutes: 70,
      summary: '经京都中转到大阪。',
      routeGeometry: {
        type: 'LineString',
        coordinates: [
          [135.8077, 34.8895],
          [135.7587, 34.9855],
          [135.4959, 34.7025]
        ]
      }
    }
  ]
}

test('collectTravelFilterOptions returns deduplicated regions and tags', () => {
  const options = collectTravelFilterOptions([
    {
      slug: 'kyoto-2026-spring',
      region: '日本',
      tags: ['城市漫游', '樱花季']
    },
    {
      slug: 'seoul-2025-autumn',
      region: '韩国',
      tags: ['城市漫游', '咖啡']
    }
  ])

  assert.deepEqual(options.regions, ['日本', '韩国'])
  assert.deepEqual(options.tags, ['城市漫游', '咖啡', '樱花季'])
})

test('filterTravelIndexEntries filters by region and requires every selected tag', () => {
  const entries = [
    {
      slug: 'kyoto-2026-spring',
      region: '日本',
      tags: ['城市漫游', '樱花季']
    },
    {
      slug: 'tokyo-2024-winter',
      region: '日本',
      tags: ['夜景', '购物']
    },
    {
      slug: 'seoul-2025-autumn',
      region: '韩国',
      tags: ['城市漫游', '咖啡']
    }
  ]

  assert.deepEqual(
    filterTravelIndexEntries(entries, { region: '日本', tags: ['城市漫游'] }).map((item) => item.slug),
    ['kyoto-2026-spring']
  )

  assert.deepEqual(
    filterTravelIndexEntries(entries, { region: '全部', tags: ['城市漫游'] }).map((item) => item.slug),
    ['kyoto-2026-spring', 'seoul-2025-autumn']
  )

  assert.deepEqual(
    filterTravelIndexEntries(entries, { region: '日本', tags: ['城市漫游', '樱花季'] }).map((item) => item.slug),
    ['kyoto-2026-spring']
  )
})

test('buildTravelTripViewModel resolves days with ordered stops and segments', () => {
  const viewModel = buildTravelTripViewModel(tripFixture)

  assert.equal(viewModel.initialDayNumber, 1)
  assert.equal(viewModel.days.length, 2)
  assert.deepEqual(viewModel.days[0].stops.map((stop) => stop.id), ['stop-kyoto-station', 'stop-kiyomizu', 'stop-gion'])
  assert.deepEqual(viewModel.days[1].segments.map((segment) => segment.id), ['seg-kyoto-to-uji', 'seg-uji-to-osaka'])
  assert.equal(viewModel.allSegments.length, 4)
})

test('projectTravelLineToViewport keeps points inside the requested box', () => {
  const result = projectTravelLineToViewport(
    [
      [135.7587, 34.9855],
      [135.785, 34.9949],
      [135.8077, 34.8895],
      [135.4959, 34.7025]
    ],
    { width: 320, height: 180, padding: 20 }
  )

  assert.equal(result.points.length, 4)
  assert.match(result.path, /^M /)
  assert.ok(result.points.every((point) => point.x >= 20 && point.x <= 300))
  assert.ok(result.points.every((point) => point.y >= 20 && point.y <= 160))
})