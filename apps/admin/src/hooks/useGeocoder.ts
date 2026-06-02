/**
 * useGeocoder — Nominatim autocomplete hook for the admin app.
 *
 * Copied from the customer app (app/src/hooks/useGeocoder.ts) and adapted
 * to import the CityConfig type from @shared. Kept as a copy rather than
 * a shared module so the customer/admin/driver app trees stay independent
 * (each has its own React tree and bundle).
 *
 * Usage policy: Nominatim allows ~1 req/s; debounced at 350ms.
 */

import { useState, useRef, useCallback } from 'react'
import type { CityConfig } from '@shared/config/cityConfig'

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
    format:         'json',
    limit:          '5',
    addressdetails: '1',
    countrycodes:   'ca',
  }
  if (opts?.bbox) {
    params.viewbox = opts.bbox
    params.bounded = '1'
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`,
    { headers: { 'Accept-Language': 'en-CA' } },
  )
  if (!res.ok) return []
  const data: any[] = await res.json()
  const typedNumber = query.trim().match(/^(\d+[-–]?\d*)\s+/)?.[1] ?? ''

  return data.map((d) => {
    const addr   = d.address ?? {}
    const road   = addr.road ?? addr.pedestrian ?? addr.suburb ?? ''
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

/** Geocode a single address string (one-shot, no debounce). */
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

/** Hook: debounced Nominatim autocomplete biased to the active city. */
export function useGeocoder(cityConfig?: CityConfig) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [loading,     setLoading]     = useState(false)
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
    }, 350)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityConfig?.cityId])

  const clear = useCallback(() => {
    setSuggestions([])
    lastReq.current = ''
  }, [])

  return { suggestions, loading, search, clear }
}
