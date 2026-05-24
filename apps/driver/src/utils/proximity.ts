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

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geolocation')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8_000,
      maximumAge: 30_000,
    })
  })
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=ca`
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
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
): Promise<ProximityResult> {
  let pos: GeolocationPosition
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
    const geocoded = await geocodeAddress(contact.address)
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
