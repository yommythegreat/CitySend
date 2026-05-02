import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Generic Canada centre — used only if no fallbackCenter prop is supplied and no markers are available yet. */
const CANADA_CENTER: L.LatLngExpression = [56.1304, -106.3468]

function makeIcon(type: 'pickup' | 'dropoff' | 'driver') {
  const html = {
    pickup: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #0b1220;box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>`,
    dropoff:`<div style="width:18px;height:18px;border-radius:3px;background:#c94a1b;box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>`,
    driver: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid #0b1220;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(11,18,32,.3)"><div style="width:8px;height:8px;border-radius:50%;background:#c94a1b"></div></div>`,
  }[type]
  const size: L.PointExpression = type === 'driver' ? [22, 22] : [18, 18]
  return L.divIcon({ html, className: '', iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] })
}

export interface MapViewProps {
  pickupCoords?: [number, number]
  dropoffCoords?: [number, number]
  routeCoords?: [number, number][]
  driverPos?: [number, number]
  /** Initial map centre before any route/marker data arrives — supply from cityConfig.mapCenter. */
  fallbackCenter?: [number, number]
  zoom?: number
  style?: React.CSSProperties
}

export function MapView({ pickupCoords, dropoffCoords, routeCoords, driverPos, fallbackCenter, zoom = 13, style }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const markersRef   = useRef<{ pickup?: L.Marker; dropoff?: L.Marker; driver?: L.Marker; route?: L.Polyline }>({})

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center:            (fallbackCenter as L.LatLngExpression | undefined) ?? CANADA_CENTER,
      zoom,
      zoomControl:       false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [zoom])

  // Update route polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (markersRef.current.route) { markersRef.current.route.remove() }
    if (routeCoords && routeCoords.length > 1) {
      markersRef.current.route = L.polyline(routeCoords, {
        color: '#0b1220', weight: 4, opacity: 0.9,
      }).addTo(map)
      // Dashed accent overlay
      L.polyline(routeCoords, {
        color: '#c94a1b', weight: 2, dashArray: '6 6', opacity: 0.9,
      }).addTo(map)
    }
  }, [routeCoords])

  // Update markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (pickupCoords) {
      if (markersRef.current.pickup) markersRef.current.pickup.setLatLng(pickupCoords)
      else markersRef.current.pickup = L.marker(pickupCoords, { icon: makeIcon('pickup') }).addTo(map)
    }

    if (dropoffCoords) {
      if (markersRef.current.dropoff) markersRef.current.dropoff.setLatLng(dropoffCoords)
      else markersRef.current.dropoff = L.marker(dropoffCoords, { icon: makeIcon('dropoff') }).addTo(map)
    }

    if (driverPos) {
      if (markersRef.current.driver) markersRef.current.driver.setLatLng(driverPos)
      else markersRef.current.driver = L.marker(driverPos, { icon: makeIcon('driver') }).addTo(map)
    }

    // Fit bounds to visible markers
    const pts = [pickupCoords, dropoffCoords].filter(Boolean) as [number, number][]
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50] })
    } else if (pts.length === 1) {
      map.setView(pts[0], 15)
    }
  }, [pickupCoords, dropoffCoords, driverPos])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', ...style }}
    />
  )
}
