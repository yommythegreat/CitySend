/**
 * useDrivingRoute — road route + ETA from the driver to the destination
 * (public OSRM, same service the customer tracking map uses). Refetches when
 * the destination changes or the driver has moved ~400 m from where the last
 * route started, so the line and ETA stay honest without hammering the API.
 */

import { useEffect, useRef, useState } from 'react'

type LatLng = { lat: number; lng: number }
export interface DrivingRoute { coords: [number, number][]; distanceM: number; durationS: number }

const REFETCH_AFTER_M = 400

function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6_371_000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function fetchRoute(from: LatLng, to: LatLng): Promise<DrivingRoute | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
    )
    const data = await res.json()
    const r = data.code === 'Ok' ? data.routes?.[0] : null
    if (!r) return null
    return {
      coords: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distanceM: r.distance,
      durationS: r.duration,
    }
  } catch {
    return null
  }
}

export function useDrivingRoute(from: LatLng | null, to: LatLng | null): DrivingRoute | null {
  const [route, setRoute] = useState<DrivingRoute | null>(null)
  const origin = useRef<LatLng | null>(null)
  const toKey = to ? `${to.lat.toFixed(5)},${to.lng.toFixed(5)}` : ''

  useEffect(() => { setRoute(null); origin.current = null }, [toKey])

  useEffect(() => {
    if (!from || !to) return
    if (origin.current && metersBetween(origin.current, from) < REFETCH_AFTER_M) return
    // Record the origin only once a route lands: if this request is cancelled
    // (deps changed mid-flight), the next run must still fetch.
    let cancelled = false
    fetchRoute(from, to).then(r => {
      if (cancelled || !r) return
      origin.current = from
      setRoute(r)
    })
    return () => { cancelled = true }
  }, [from?.lat, from?.lng, toKey])

  return route
}
