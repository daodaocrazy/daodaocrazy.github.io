function compareLocalizedText(left, right) {
  return left.localeCompare(right, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
}

function sanitizeDimension(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function normalizeBounds(bounds) {
  if (!bounds) {
    return null
  }

  if (Array.isArray(bounds) && bounds.length === 4) {
    return {
      minLng: bounds[0],
      minLat: bounds[1],
      maxLng: bounds[2],
      maxLat: bounds[3]
    }
  }

  return bounds
}

function calculateBounds(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return {
      minLng: 0,
      minLat: 0,
      maxLng: 1,
      maxLat: 1
    }
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

  if (minLng === maxLng) {
    minLng -= 0.01
    maxLng += 0.01
  }

  if (minLat === maxLat) {
    minLat -= 0.01
    maxLat += 0.01
  }

  return { minLng, minLat, maxLng, maxLat }
}

function flattenSegmentCoordinates(segments) {
  return segments.flatMap((segment) => segment.routeGeometry?.coordinates ?? [])
}

export function collectTravelFilterOptions(entries) {
  const regions = new Set()
  const tags = new Set()

  for (const entry of entries) {
    if (entry.region) {
      regions.add(entry.region)
    }

    for (const tag of entry.tags ?? []) {
      tags.add(tag)
    }
  }

  return {
    regions: [...regions],
    tags: [...tags].sort(compareLocalizedText)
  }
}

export function filterTravelIndexEntries(entries, filters = {}) {
  const selectedRegion = filters.region ?? '全部'
  const selectedTags = filters.tags ?? []

  return entries.filter((entry) => {
    const regionMatch = selectedRegion === '全部' || entry.region === selectedRegion
    const tagMatch = selectedTags.length === 0 || selectedTags.every((tag) => entry.tags.includes(tag))
    return regionMatch && tagMatch
  })
}

export function formatTravelDateRange(startDate, endDate) {
  const formatDate = (value) => value.replace(/-/g, '.')

  if (startDate === endDate) {
    return formatDate(startDate)
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export function formatTravelDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '--'
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) {
    return `${minutes} 分钟`
  }

  if (remainder === 0) {
    return `${hours} 小时`
  }

  return `${hours} 小时 ${remainder} 分钟`
}

export function formatTravelDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return '--'
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters} m`
  }

  const kilometers = distanceMeters >= 10000
    ? Math.round(distanceMeters / 1000).toString()
    : (distanceMeters / 1000).toFixed(1).replace(/\.0$/, '')

  return `${kilometers} km`
}

export function formatTravelMode(mode) {
  const labelMap = {
    walk: '步行',
    bus: '公交',
    subway: '地铁',
    train: '火车',
    tram: '电车',
    taxi: '出租车',
    ferry: '渡轮',
    car: '自驾',
    bike: '骑行',
    flight: '航班',
    bus_walk: '公交 + 步行',
    train_walk: '铁路 + 步行'
  }

  return labelMap[mode] ?? mode.replace(/_/g, ' / ')
}

export function buildDayTimelineItems(day) {
  const items = []

  day.stops.forEach((stop, index) => {
    items.push({ kind: 'stop', id: stop.id, stop })

    if (day.segments[index]) {
      items.push({ kind: 'segment', id: day.segments[index].id, segment: day.segments[index] })
    }
  })

  return items
}

export function buildTravelTripViewModel(envelope) {
  const stopsById = new Map(envelope.stops.map((stop) => [stop.id, stop]))
  const segmentsById = new Map(envelope.segments.map((segment) => [segment.id, segment]))
  const orderedDays = [...envelope.days].sort((left, right) => left.dayNumber - right.dayNumber)

  const days = orderedDays.map((day) => {
    const stops = day.stopIds.map((id) => stopsById.get(id)).filter(Boolean)
    const segments = day.segmentIds.map((id) => segmentsById.get(id)).filter(Boolean)

    return {
      ...day,
      stops,
      segments,
      timelineItems: buildDayTimelineItems({ ...day, stops, segments })
    }
  })

  const allStops = [...envelope.stops].sort((left, right) => {
    if (left.dayNumber !== right.dayNumber) {
      return left.dayNumber - right.dayNumber
    }

    return left.order - right.order
  })

  const allSegments = [...envelope.segments].sort((left, right) => {
    if (left.dayNumber !== right.dayNumber) {
      return left.dayNumber - right.dayNumber
    }

    return left.order - right.order
  })

  const bounds = calculateBounds([
    ...allStops.map((stop) => stop.coordinates),
    ...flattenSegmentCoordinates(allSegments)
  ])

  return {
    trip: envelope.trip,
    days,
    allStops,
    allSegments,
    bounds,
    initialDayNumber: days[0]?.dayNumber ?? null
  }
}

export function projectCoordinateToViewport(coordinate, options = {}) {
  const width = sanitizeDimension(options.width, 320)
  const height = sanitizeDimension(options.height, 180)
  const padding = sanitizeDimension(options.padding, 20)
  const bounds = normalizeBounds(options.bounds) ?? calculateBounds([coordinate])
  const usableWidth = Math.max(width - padding * 2, 1)
  const usableHeight = Math.max(height - padding * 2, 1)
  const deltaLng = Math.max(bounds.maxLng - bounds.minLng, 0.0001)
  const deltaLat = Math.max(bounds.maxLat - bounds.minLat, 0.0001)
  const scale = Math.min(usableWidth / deltaLng, usableHeight / deltaLat)
  const drawingWidth = deltaLng * scale
  const drawingHeight = deltaLat * scale
  const offsetX = padding + (usableWidth - drawingWidth) / 2
  const offsetY = padding + (usableHeight - drawingHeight) / 2

  return {
    x: offsetX + (coordinate[0] - bounds.minLng) * scale,
    y: height - offsetY - (coordinate[1] - bounds.minLat) * scale
  }
}

export function projectTravelLineToViewport(coordinates, options = {}) {
  const width = sanitizeDimension(options.width, 320)
  const height = sanitizeDimension(options.height, 180)
  const padding = sanitizeDimension(options.padding, 20)
  const bounds = normalizeBounds(options.bounds) ?? calculateBounds(coordinates)
  const points = coordinates.map((coordinate) => projectCoordinateToViewport(coordinate, {
    width,
    height,
    padding,
    bounds
  }))
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  return {
    bounds,
    points,
    path,
    viewBox: `0 0 ${width} ${height}`
  }
}