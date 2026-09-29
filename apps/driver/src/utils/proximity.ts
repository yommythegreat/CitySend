import { Capacitor } from '@capacitor/core'
import { CITY_CONFIGS } from '@shared/config/cityConfig'

/** Haversine distance between two WGS-84 points, in metres. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface Coords { latitude: number; longitude: number }

/** Rejects with { code: 1 } when permission is denied (same shape as the web API). */
async function getPosition(): Promise<{ coords: Coords }> {
  if (Capacitor.isNativePlatform()) {
    // Native CoreLocation — avoids WebKit's second "localhost would like to
    // use your location" prompt that navigator.geolocation triggers.
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.checkPermissions().catch(() => null)
    if (perm?.location === 'denied') throw { code: 1 }
    try {
      return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 })
    } catch (e: any) {
      if (/denied|not authorized/i.test(e?.message ?? '')) throw { code: 1 }
      throw e
    }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geolocation')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8_000,
      maximumAge: 30_000,
    })
  })
}

const geocodeCache = new Map<string, { lat: number; lng: number }>()

/**
 * Address → coordinates via Nominatim, searched inside the order's city.
 * Saved addresses are often just the street line ("134 Princess Street"),
 * which unbounded matched the same street in another city (Peterborough).
 * Cached for the session.
 */
export async function geocodeAddress(address: string, cityId = 'winnipeg'): Promise<{ lat: number; lng: number } | null> {
  const key = `${cityId}|${address}`
  const hit = geocodeCache.get(key)
  if (hit) return hit
  const city = CITY_CONFIGS.find(c => c.cityId === cityId) ?? CITY_CONFIGS[0]
  const cityName = city.geocodeContext.split(',')[0].trim().toLowerCase()
  const q = address.toLowerCase().includes(cityName) ? address : `${address}, ${city.geocodeContext}`
  const params = new URLSearchParams({
    q, format: 'json', limit: '1', countrycodes: 'ca',
    viewbox: city.geocodeBbox, bounded: '1',
  })
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) return null
    const point = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    geocodeCache.set(key, point)
    return point
  } catch {
    return null
  }
}

export type ProximityResult =
  | { status: 'ok' }
  | { status: 'too_far';        distanceMeters: number }
  | { status: 'location_denied' }
  | { status: 'location_error' }
  | { status: 'geocode_failed' }

const THRESHOLD_METERS = 300

/**
 * Check whether the driver is within THRESHOLD_METERS of the given address.
 * Uses stored lat/lng from the order if available; otherwise geocodes via Nominatim.
 */
export async function checkProximity(
  contact: { address: string; lat?: number; lng?: number },
  cityId?: string,
): Promise<ProximityResult> {
  let pos: { coords: Coords }
  try {
    pos = await getPosition()
  } catch (e: any) {
    if (e?.code === 1) return { status: 'location_denied' }
    return { status: 'location_error' }
  }

  const driverLat = pos.coords.latitude
  const driverLng = pos.coords.longitude

  let targetLat = contact.lat
  let targetLng = contact.lng

  if (targetLat == null || targetLng == null) {
    const geocoded = await geocodeAddress(contact.address, cityId)
    if (!geocoded) return { status: 'geocode_failed' }
    targetLat = geocoded.lat
    targetLng = geocoded.lng
  }

  const dist = haversineMeters(driverLat, driverLng, targetLat, targetLng)
  return dist <= THRESHOLD_METERS
    ? { status: 'ok' }
    : { status: 'too_far', distanceMeters: dist }
}

/** Human-readable distance string, e.g. "1.2 km" or "240 m". */
export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}
