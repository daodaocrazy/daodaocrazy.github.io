import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TRAVEL_BASEMAPS,
  basemapScopeKey,
  isOutsideChina,
  orderBasemapChain,
  selectBasemapChain,
  toBasemapCoordinate,
  wgs84ToGcj02
} from '../docs/.vitepress/theme/utils/travel-map-basemap.mjs'

function toRadians(value) {
  return (value * Math.PI) / 180
}

function distanceMeters([lngA, latA], [lngB, latB]) {
  const earthRadius = 6371008.8
  const deltaLat = toRadians(latB - latA)
  const deltaLng = toRadians(lngB - lngA)
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLng / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

const samples = {
  // 事实行程数据里的真实坐标。
  urumqi: [87.6168, 43.8256],
  kanas: [87.0556, 48.6801],
  kyotoStation: [135.7587, 34.9855],
  asakusa: [139.7947, 35.7148],
  london: [-0.1276, 51.5072]
}

test('TRAVEL_BASEMAPS declares every field the map panel reads', () => {
  assert.ok(TRAVEL_BASEMAPS.length >= 2)

  for (const basemap of TRAVEL_BASEMAPS) {
    assert.equal(typeof basemap.id, 'string', `${basemap.id}: id 必须是字符串`)
    assert.ok(basemap.url.includes('{x}'), `${basemap.id}: url 缺少 {x}`)
    assert.ok(basemap.url.includes('{y}'), `${basemap.id}: url 缺少 {y}`)
    assert.ok(basemap.url.includes('{z}'), `${basemap.id}: url 缺少 {z}`)
    assert.equal(typeof basemap.maxZoom, 'number', `${basemap.id}: maxZoom 必须是数字`)
    assert.equal(typeof basemap.requiresGcj02, 'boolean', `${basemap.id}: requiresGcj02 必须是布尔值`)
    assert.ok(['global', 'china'].includes(basemap.scope), `${basemap.id}: scope 必须是 global 或 china`)
    assert.ok(basemap.attribution.length > 0, `${basemap.id}: 必须声明版权署名`)
  }

  assert.equal(TRAVEL_BASEMAPS[0].requiresGcj02, false, '首选底图应是 WGS-84')
  assert.ok(
    TRAVEL_BASEMAPS.some((basemap) => basemap.scope === 'global' && basemap.id !== TRAVEL_BASEMAPS[0].id),
    '需要一个全球底图作为兜底，否则境外行程无图可用'
  )
})

test('selectBasemapChain keeps a global fallback for every trip', () => {
  for (const region of ['日本', '日本 东京', '中国 新疆', '', undefined]) {
    const chain = selectBasemapChain(region)

    assert.ok(chain.length >= 1, `${region}: 兜底链不能为空`)
    assert.equal(chain[0].id, TRAVEL_BASEMAPS[0].id, `${region}: 首选应保持为首选`)
    assert.ok(
      chain.some((basemap) => basemap.scope === 'global' && basemap !== chain[0]),
      `${region}: 兜底链里必须有一个全球底图`
    )
  }
})

test('selectBasemapChain only offers the China basemap to China trips', () => {
  const chinaIds = selectBasemapChain('中国 新疆').filter((b) => b.scope === 'china').map((b) => b.id)
  const japanIds = selectBasemapChain('日本 东京').filter((b) => b.scope === 'china').map((b) => b.id)

  assert.deepEqual(chinaIds, ['amap'], '中国行程应包含高德兜底')
  assert.deepEqual(japanIds, [], '日本行程必须跳过没有境外数据的高德')
})

test('isOutsideChina separates overseas coordinates from mainland ones', () => {
  assert.equal(isOutsideChina(...samples.london), true, '伦敦应判定为境外')
  assert.equal(isOutsideChina(...samples.urumqi), false, '乌鲁木齐应判定为境内')
  assert.equal(isOutsideChina(...samples.kanas), false, '喀纳斯应判定为境内')
})

// 这条固定了已知限制：GCJ-02 惯用的 outOfChina 是一个粗包围盒
// （经度 72–137.8、纬度 0.8–55.8），西日本、韩国等地都落在盒内。
// 东经 139.8 的东京在盒外，京都则被误判为境内。
// 因此绝不能靠它来判断该不该纠偏，真正的保护是
// selectBasemapChain 不给境外行程提供 GCJ-02 底图。
test('the coarse China bbox reaches into western Japan, so it cannot guard conversion by itself', () => {
  assert.equal(isOutsideChina(...samples.kyotoStation), false, '粗包围盒把京都算作境内是已知行为')
  assert.notDeepEqual(wgs84ToGcj02(samples.kyotoStation), samples.kyotoStation, '京都坐标会被粗包围盒误判并偏移')
  assert.equal(isOutsideChina(...samples.asakusa), true, '东京在粗包围盒之外')

  const japanChain = selectBasemapChain('日本 东京')
  const kyotoChain = selectBasemapChain('日本')

  for (const chain of [japanChain, kyotoChain]) {
    assert.equal(
      chain.some((basemap) => basemap.requiresGcj02),
      false,
      '境外行程的底图链里不能出现 GCJ-02 底图，否则上面的误判会真的生效'
    )
  }
})

test('wgs84ToGcj02 leaves genuinely overseas coordinates untouched', () => {
  assert.deepEqual(wgs84ToGcj02(samples.london), samples.london)
})

test('wgs84ToGcj02 shifts mainland coordinates by a street-level distance', () => {
  for (const name of ['urumqi', 'kanas']) {
    const original = samples[name]
    const converted = wgs84ToGcj02(original)
    const shift = distanceMeters(original, converted)

    assert.notDeepEqual(converted, original, `${name}: 境内坐标必须被移动`)
    assert.ok(shift > 100, `${name}: 偏移 ${shift.toFixed(0)}m 小于预期`)
    assert.ok(shift < 1000, `${name}: 偏移 ${shift.toFixed(0)}m 大于预期`)
  }
})

test('wgs84ToGcj02 keeps the [lng, lat] order and stays near the input', () => {
  const converted = wgs84ToGcj02(samples.urumqi)

  assert.ok(Math.abs(converted[0] - samples.urumqi[0]) < 0.01, '经度偏移量级异常')
  assert.ok(Math.abs(converted[1] - samples.urumqi[1]) < 0.01, '纬度偏移量级异常')
})

test('toBasemapCoordinate only converts for GCJ-02 basemaps', () => {
  const [osm, amap] = TRAVEL_BASEMAPS

  assert.deepEqual(toBasemapCoordinate(samples.urumqi, osm), samples.urumqi)
  assert.deepEqual(toBasemapCoordinate(samples.urumqi, amap), wgs84ToGcj02(samples.urumqi))
  assert.deepEqual(toBasemapCoordinate(samples.kyotoStation, osm), samples.kyotoStation)
  assert.deepEqual(toBasemapCoordinate(samples.london, amap), samples.london)
  assert.deepEqual(toBasemapCoordinate(samples.urumqi, undefined), samples.urumqi)
})

test('orderBasemapChain promotes the remembered basemap without dropping candidates', () => {
  const chain = selectBasemapChain('日本 东京')
  const ordered = orderBasemapChain(chain, 'esri')

  assert.equal(ordered[0].id, 'esri', '记住的底图应排到最前')
  assert.equal(ordered.length, chain.length, '不能丢掉任何候选，否则换网络后无法降级')
  assert.deepEqual(
    [...ordered].map((basemap) => basemap.id).sort(),
    [...chain].map((basemap) => basemap.id).sort(),
    '顺序变化不应该增删候选'
  )
})

test('orderBasemapChain ignores a remembered basemap that the trip cannot use', () => {
  const japanChain = selectBasemapChain('日本 东京')
  const ordered = orderBasemapChain(japanChain, 'amap')

  assert.deepEqual(ordered, japanChain, '日本行程里没有高德，应原样返回')
  assert.deepEqual(orderBasemapChain(japanChain, undefined), japanChain, '没有记忆时应原样返回')
  assert.deepEqual(orderBasemapChain(japanChain, 'unknown-id'), japanChain, '未知 id 应原样返回')
})

// 如果中国行程和境外行程共用一份记忆，在日本页面记住的全球底图会被带进新疆页面，
// 于是新疆就再也拿不到高德的中文标注。
test('basemapScopeKey keeps China and overseas trips in separate memory slots', () => {
  assert.equal(basemapScopeKey('中国 新疆'), 'china')
  assert.equal(basemapScopeKey('日本 东京'), 'global')
  assert.equal(basemapScopeKey('日本'), 'global')
  assert.equal(basemapScopeKey(''), 'global')
  assert.equal(basemapScopeKey(undefined), 'global')
  assert.notEqual(basemapScopeKey('中国 新疆'), basemapScopeKey('日本 东京'))
})
