import derivedTravelIndex from '../../../.data/travel/derived/travel-index.json'

const tripModules = import.meta.glob('../../../.data/travel/trips/*.json', {
  eager: true,
  import: 'default'
})

const allTrips = Object.values(tripModules).sort((left, right) => {
  const leftTime = Date.parse(left.trip.publishedAt ?? left.trip.endDate)
  const rightTime = Date.parse(right.trip.publishedAt ?? right.trip.endDate)
  return rightTime - leftTime
})

export function getTravelIndexEntries() {
  return derivedTravelIndex
}

export function getTravelTripBySlug(slug) {
  return allTrips.find((entry) => entry.trip.slug === slug) ?? null
}