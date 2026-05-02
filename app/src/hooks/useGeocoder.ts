import { useState, useRef, useCallback } from 'react'
import type { CityConfig } from '../config/cityConfig'

export interface GeoSuggestion {
  displayName: string
  shortName: string
  lat: number
  lng: number
}

interface NominatimOptions {
  /** Nominatim viewbox string (minLng,minLat,maxLng,maxLat) — biases results to a city boundary */
  bbox?: string
  /** City context string appended to the query (e.g. "Toronto, ON, Canada") */
  context?: string
}

async function nominatimSearch(query: string, opts?: NominatimOptions): Promise<GeoSuggestion[]> {
  if (query.trim().length < 3) return []
  const q = opts?.context ? `${query}, ${opts.context}` : query
  const params: Record<string, string> = {
    q,
    format:        'json',
    limit:         '5',
    addressdetails:'1',
    countrycodes:  'ca',
  }
  if (opts?.bbox) {
    params.viewbox  = opts.bbox
    params.bounded  = '1'
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`,
    { headers: { 'Accept-Language': 'en-CA' } }
  )
  if (!res.ok) return []
  const data: any[] = await res.json()
  // Extract any leading house number the user typed (e.g. "80" from "80 Brian Monkman Bay")
  const typedNumber = query.trim().match(/^(\d+[-–]?\d*)\s+/)?.[1] ?? ''

  return data.map((d) => {
    const addr   = d.address ?? {}
    const road   = addr.road ?? addr.pedestrian ?? addr.suburb ?? ''
    // Nominatim often omits house_number when it matches a street rather than
    // a specific door. Fall back to whatever the user typed so the number
    // the user entered is always preserved in the displayed suggestion.
    const number = addr.house_number || typedNumber
    const short  = [number, road].filter(Boolean).join(' ') || d.display_name.split(',')[0]
    return {
      displayName: d.display_name,
      shortName:   short,
      lat:         parseFloat(d.lat),
      lng:         parseFloat(d.lon),
    }
  })
}

/**
 * Geocode a single address string.
 * Pass a CityConfig to bias the search to the active city's bounding box.
 */
export async function geocodeOnce(
  address: string,
  cityConfig?: CityConfig,
): Promise<{ lat: number; lng: number } | null> {
  const opts = cityConfig
    ? { bbox: cityConfig.geocodeBbox, context: cityConfig.geocodeContext }
    : undefined
  const results = await nominatimSearch(address, opts).catch(() => [])
  if (!results.length) return null
  return { lat: results[0].lat, lng: results[0].lng }
}

/** Fetch real route from OSRM public API */
export async function fetchRoute(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): Promise<{ distanceM: number; durationS: number; coords: [number, number][] } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`
    const res  = await fetch(url)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    const route = data.routes[0]
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    )
    return { distanceM: route.distance, durationS: route.duration, coords }
  } catch {
    return null
  }
}

/**
 * Hook: debounced Nominatim autocomplete.
 * Pass a CityConfig to bias results to the active city's bounding box.
 */
export function useGeocoder(cityConfig?: CityConfig) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastReq = useRef<string>('')

  const opts: NominatimOptions | undefined = cityConfig
    ? { bbox: cityConfig.geocodeBbox, context: cityConfig.geocodeContext }
    : undefined

  const search = useCallback((query: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (query.trim().length < 3) { setSuggestions([]); return }

    timer.current = setTimeout(async () => {
      if (query === lastReq.current) return
      lastReq.current = query
      setLoading(true)
      try {
        setSuggestions(await nominatimSearch(query, opts))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350) // 350ms debounce — Nominatim usage policy: max 1 req/s
  // opts is a new object each render; stringify to stabilise the dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityConfig?.cityId])

  const clear = useCallback(() => {
    setSuggestions([])
    lastReq.current = ''
  }, [])

  return { suggestions, loading, search, clear }
}
