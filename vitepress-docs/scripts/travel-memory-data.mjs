import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function toFsPath(pathLike) {
  if (pathLike instanceof URL) {
    return fileURLToPath(pathLike)
  }

  return path.resolve(String(pathLike))
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isTimeString(value) {
  return /^\d{2}:\d{2}$/.test(value)
}

function isHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

function isCoordinatePair(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isLineString(value) {
  return isRecord(value)
    && value.type === 'LineString'
    && Array.isArray(value.coordinates)
    && value.coordinates.every(isCoordinatePair)
}

function expect(condition, message, errors) {
  if (!condition) {
    errors.push(message)
  }
}

function validateTripEnvelope(envelope, fileName) {
  const errors = []
  const { trip, days, stops, segments } = envelope

  expect(isRecord(envelope), `${fileName}: 顶层数据必须是对象`, errors)
  expect(isRecord(trip), `${fileName}: trip 必须是对象`, errors)
  expect(Array.isArray(days), `${fileName}: days 必须是数组`, errors)
  expect(Array.isArray(stops), `${fileName}: stops 必须是数组`, errors)
  expect(Array.isArray(segments), `${fileName}: segments 必须是数组`, errors)

  if (!isRecord(trip) || !Array.isArray(days) || !Array.isArray(stops) || !Array.isArray(segments)) {
    return errors
  }

  const requiredTripFields = [
    'id',
    'slug',
    'title',
    'startDate',
    'endDate',
    'daysCount',
    'region',
    'places',
    'tags',
    'coverImage',
    'summary',
    'intro',
    'routePreview',
    'status'
  ]

  for (const field of requiredTripFields) {
    expect(trip[field] !== undefined, `${fileName}: trip.${field} 缺失`, errors)
  }

  expect(isNonEmptyString(trip.id), `${fileName}: trip.id 必须是非空字符串`, errors)
  expect(isNonEmptyString(trip.slug), `${fileName}: trip.slug 必须是非空字符串`, errors)
  expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trip.slug), `${fileName}: trip.slug 必须是 kebab-case`, errors)
  expect(`${trip.slug}.json` === fileName, `${fileName}: 文件名必须与 trip.slug 对应`, errors)
  expect(isNonEmptyString(trip.title), `${fileName}: trip.title 必须是非空字符串`, errors)
  expect(isDateString(trip.startDate), `${fileName}: trip.startDate 必须是 YYYY-MM-DD`, errors)
  expect(isDateString(trip.endDate), `${fileName}: trip.endDate 必须是 YYYY-MM-DD`, errors)
  expect(Number.isInteger(trip.daysCount) && trip.daysCount > 0, `${fileName}: trip.daysCount 必须是正整数`, errors)
  expect(Array.isArray(trip.places) && trip.places.every(isNonEmptyString), `${fileName}: trip.places 必须是非空字符串数组`, errors)
  expect(Array.isArray(trip.tags) && trip.tags.every(isNonEmptyString), `${fileName}: trip.tags 必须是非空字符串数组`, errors)
  expect(['draft', 'published'].includes(trip.status), `${fileName}: trip.status 只允许 draft 或 published`, errors)
  expect(isRecord(trip.routePreview), `${fileName}: trip.routePreview 必须是对象`, errors)

  if (isRecord(trip.routePreview)) {
    expect(Array.isArray(trip.routePreview.bbox) && trip.routePreview.bbox.length === 4, `${fileName}: trip.routePreview.bbox 必须包含 4 个数字`, errors)
    expect(isCoordinatePair(trip.routePreview.center), `${fileName}: trip.routePreview.center 必须是 [lng, lat]`, errors)
    expect(isLineString(trip.routePreview.line), `${fileName}: trip.routePreview.line 必须是 LineString`, errors)
  }

  expect(trip.daysCount === days.length, `${fileName}: trip.daysCount 必须等于 days.length`, errors)
  expect(stops.length > 0, `${fileName}: 至少需要一个 stop`, errors)

  const dayNumbers = new Set()
  const stopIds = new Set()

  days.forEach((day, index) => {
    expect(isRecord(day), `${fileName}: days[${index}] 必须是对象`, errors)
    if (!isRecord(day)) {
      return
    }

    expect(day.dayNumber === index + 1, `${fileName}: days[${index}] 的 dayNumber 必须连续递增`, errors)
    expect(isDateString(day.date), `${fileName}: days[${index}].date 必须是 YYYY-MM-DD`, errors)
    expect(isNonEmptyString(day.title), `${fileName}: days[${index}].title 必须是非空字符串`, errors)
    expect(isNonEmptyString(day.summary), `${fileName}: days[${index}].summary 必须是非空字符串`, errors)
    expect(isHexColor(day.color), `${fileName}: days[${index}].color 必须是十六进制颜色`, errors)
    expect(Array.isArray(day.stopIds), `${fileName}: days[${index}].stopIds 必须是数组`, errors)
    expect(Array.isArray(day.segmentIds), `${fileName}: days[${index}].segmentIds 必须是数组`, errors)
    dayNumbers.add(day.dayNumber)
  })

  const stopsByDay = new Map()

  stops.forEach((stop, index) => {
    expect(isRecord(stop), `${fileName}: stops[${index}] 必须是对象`, errors)
    if (!isRecord(stop)) {
      return
    }

    expect(isNonEmptyString(stop.id), `${fileName}: stops[${index}].id 必须是非空字符串`, errors)
    expect(Number.isInteger(stop.dayNumber) && dayNumbers.has(stop.dayNumber), `${fileName}: stops[${index}].dayNumber 必须指向存在的 day`, errors)
    expect(Number.isInteger(stop.order) && stop.order > 0, `${fileName}: stops[${index}].order 必须是正整数`, errors)
    expect(isNonEmptyString(stop.name), `${fileName}: stops[${index}].name 必须是非空字符串`, errors)
    expect(isNonEmptyString(stop.type), `${fileName}: stops[${index}].type 必须是非空字符串`, errors)
    expect(isCoordinatePair(stop.coordinates), `${fileName}: stops[${index}].coordinates 必须是 [lng, lat]`, errors)
    expect(isTimeString(stop.arrivalTime), `${fileName}: stops[${index}].arrivalTime 必须是 HH:mm`, errors)
    expect(isTimeString(stop.departureTime), `${fileName}: stops[${index}].departureTime 必须是 HH:mm`, errors)
    expect(Number.isInteger(stop.stayMinutes) && stop.stayMinutes >= 0, `${fileName}: stops[${index}].stayMinutes 必须是非负整数`, errors)
    expect(isNonEmptyString(stop.note), `${fileName}: stops[${index}].note 必须是非空字符串`, errors)
    stopIds.add(stop.id)

    const dayStops = stopsByDay.get(stop.dayNumber) ?? []
    dayStops.push(stop)
    stopsByDay.set(stop.dayNumber, dayStops)
  })

  const segmentsByDay = new Map()

  segments.forEach((segment, index) => {
    expect(isRecord(segment), `${fileName}: segments[${index}] 必须是对象`, errors)
    if (!isRecord(segment)) {
      return
    }

    expect(isNonEmptyString(segment.id), `${fileName}: segments[${index}].id 必须是非空字符串`, errors)
    expect(Number.isInteger(segment.dayNumber) && dayNumbers.has(segment.dayNumber), `${fileName}: segments[${index}].dayNumber 必须指向存在的 day`, errors)
    expect(Number.isInteger(segment.order) && segment.order > 0, `${fileName}: segments[${index}].order 必须是正整数`, errors)
    expect(stopIds.has(segment.fromStopId), `${fileName}: segments[${index}].fromStopId 必须指向存在的 stop`, errors)
    expect(stopIds.has(segment.toStopId), `${fileName}: segments[${index}].toStopId 必须指向存在的 stop`, errors)
    expect(isNonEmptyString(segment.mode), `${fileName}: segments[${index}].mode 必须是非空字符串`, errors)
    expect(Number.isInteger(segment.distanceMeters) && segment.distanceMeters >= 0, `${fileName}: segments[${index}].distanceMeters 必须是非负整数`, errors)
    expect(Number.isInteger(segment.durationMinutes) && segment.durationMinutes >= 0, `${fileName}: segments[${index}].durationMinutes 必须是非负整数`, errors)
    expect(isNonEmptyString(segment.summary), `${fileName}: segments[${index}].summary 必须是非空字符串`, errors)
    expect(isLineString(segment.routeGeometry), `${fileName}: segments[${index}].routeGeometry 必须是 LineString`, errors)

    const daySegments = segmentsByDay.get(segment.dayNumber) ?? []
    daySegments.push(segment)
    segmentsByDay.set(segment.dayNumber, daySegments)
  })

  days.forEach((day, index) => {
    const dayStops = (stopsByDay.get(day.dayNumber) ?? []).sort((left, right) => left.order - right.order)
    const daySegments = (segmentsByDay.get(day.dayNumber) ?? []).sort((left, right) => left.order - right.order)

    expect(day.stopIds.length === dayStops.length, `${fileName}: days[${index}].stopIds 数量必须与当天 stop 数量一致`, errors)
    expect(day.segmentIds.length === daySegments.length, `${fileName}: days[${index}].segmentIds 数量必须与当天 segment 数量一致`, errors)

    if (day.stopIds.length === dayStops.length) {
      expect(day.stopIds.every((id, stopIndex) => id === dayStops[stopIndex].id), `${fileName}: days[${index}].stopIds 顺序必须与 stop.order 一致`, errors)
    }

    if (day.segmentIds.length === daySegments.length) {
      expect(day.segmentIds.every((id, segmentIndex) => id === daySegments[segmentIndex].id), `${fileName}: days[${index}].segmentIds 顺序必须与 segment.order 一致`, errors)
    }
  })

  return errors
}

function sortTripsByPublishedDate(trips) {
  return [...trips].sort((left, right) => {
    const leftTime = Date.parse(left.trip.publishedAt ?? left.trip.endDate)
    const rightTime = Date.parse(right.trip.publishedAt ?? right.trip.endDate)
    return rightTime - leftTime
  })
}

export function loadTravelTripsFromDir(tripsDir) {
  const resolvedTripsDir = toFsPath(tripsDir)

  if (!fs.existsSync(resolvedTripsDir)) {
    return []
  }

  const fileNames = fs.readdirSync(resolvedTripsDir)
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }))

  const trips = fileNames.map((fileName) => {
    const absolutePath = path.join(resolvedTripsDir, fileName)
    const rawContent = fs.readFileSync(absolutePath, 'utf8')
    const envelope = JSON.parse(rawContent)
    const errors = validateTripEnvelope(envelope, fileName)

    if (errors.length > 0) {
      throw new Error(`travel-memory 数据校验失败:\n- ${errors.join('\n- ')}`)
    }

    return envelope
  })

  return sortTripsByPublishedDate(trips)
}

export function deriveTravelIndexEntries(trips) {
  return sortTripsByPublishedDate(trips)
    .filter((item) => item.trip.status === 'published')
    .map(({ trip }) => ({
      slug: trip.slug,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      daysCount: trip.daysCount,
      region: trip.region,
      places: trip.places,
      tags: trip.tags,
      coverImage: trip.coverImage,
      summary: trip.summary,
      publishedAt: trip.publishedAt ?? null,
      routePreview: trip.routePreview
    }))
}

export function buildTripMarkdownShell(trip) {
  return `---
title: ${trip.title}
description: ${trip.summary}
layout: page
outline: false
aside: false
pageClass: travel-memory-trip-page
travelSlug: ${trip.slug}
---
`
}

export function syncTravelMemoryArtifacts({
  tripsDir,
  derivedIndexPath,
  generatedPagesDir
}) {
  const trips = loadTravelTripsFromDir(tripsDir)
  const derivedEntries = deriveTravelIndexEntries(trips)
  const resolvedDerivedIndexPath = toFsPath(derivedIndexPath)
  const resolvedGeneratedPagesDir = toFsPath(generatedPagesDir)

  fs.mkdirSync(path.dirname(resolvedDerivedIndexPath), { recursive: true })
  fs.mkdirSync(resolvedGeneratedPagesDir, { recursive: true })
  fs.writeFileSync(resolvedDerivedIndexPath, `${JSON.stringify(derivedEntries, null, 2)}\n`, 'utf8')

  const generatedPages = trips.map(({ trip }) => {
    const filePath = path.join(resolvedGeneratedPagesDir, `${trip.slug}.md`)
    fs.writeFileSync(filePath, buildTripMarkdownShell(trip), 'utf8')
    return filePath
  })

  return {
    trips,
    derivedEntries,
    generatedPages
  }
}