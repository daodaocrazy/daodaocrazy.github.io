// 底图瓦片源与坐标系适配。
//
// 行程数据统一是 WGS-84、[经度, 纬度]。海外底图（OSM）直接叠加即可；
// 中国大陆的底图服务（高德、腾讯、天地图）对外发布的是 GCJ-02，
// 直接把 WGS-84 数据画上去会有数百米偏移，必须先在境内做一次纠偏。

const GCJ_SEMI_MAJOR_AXIS = 6378245
const GCJ_ECCENTRICITY_SQUARED = 0.00669342162296594323

export const TRAVEL_BASEMAPS = [
  {
    id: 'osm',
    scope: 'global',
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    requiresGcj02: false,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 贡献者'
  },
  {
    id: 'amap',
    scope: 'china',
    label: '高德地图',
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    subdomains: '1234',
    maxZoom: 18,
    requiresGcj02: true,
    attribution: '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图</a>'
  },
  {
    id: 'esri',
    scope: 'global',
    label: 'Esri World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 19,
    requiresGcj02: false,
    attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>'
  }
]

// 高德在中国大陆以外没有瓦片数据（实测日韩等地返回空白瓦片），
// 所以只能给中国境内的行程兜底；境外行程要跳过它直接走全球底图。
export function selectBasemapChain(tripRegion) {
  const isChinaTrip = /中国|china/i.test(tripRegion ?? '')

  return TRAVEL_BASEMAPS.filter((basemap) => basemap.scope !== 'china' || isChinaTrip)
}

export function isOutsideChina(longitude, latitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function offsetLatitude(x, y) {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  value += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  value += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
  value += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
  return value
}

function offsetLongitude(x, y) {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  value += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  value += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
  value += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
  return value
}

export function wgs84ToGcj02(coordinate) {
  const [longitude, latitude] = coordinate

  if (isOutsideChina(longitude, latitude)) {
    return [longitude, latitude]
  }

  const x = longitude - 105
  const y = latitude - 35
  let deltaLatitude = offsetLatitude(x, y)
  let deltaLongitude = offsetLongitude(x, y)
  const radianLatitude = (latitude / 180) * Math.PI
  let magic = Math.sin(radianLatitude)
  magic = 1 - GCJ_ECCENTRICITY_SQUARED * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  deltaLatitude = (deltaLatitude * 180)
    / (((GCJ_SEMI_MAJOR_AXIS * (1 - GCJ_ECCENTRICITY_SQUARED)) / (magic * sqrtMagic)) * Math.PI)
  deltaLongitude = (deltaLongitude * 180)
    / ((GCJ_SEMI_MAJOR_AXIS / sqrtMagic) * Math.cos(radianLatitude) * Math.PI)

  return [longitude + deltaLongitude, latitude + deltaLatitude]
}

export function toBasemapCoordinate(coordinate, basemap) {
  return basemap?.requiresGcj02 ? wgs84ToGcj02(coordinate) : coordinate
}
