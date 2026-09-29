import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type LatLng = { lat: number; lng: number }

export interface DeliveryMapHandle { recenter: () => void }

interface Props {
  target?:     LatLng
  targetKind:  'pickup' | 'dropoff'
  driver?:     LatLng | null
  route?:      [number, number][] | null
  /** Bottom area (px) covered by the sheet, so fitting keeps pins visible. */
  bottomInset: number
}

const WINNIPEG: L.LatLngExpression = [49.8951, -97.1384]

const icon = (html: string, size: number) =>
  L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })

const ICONS = {
  pickup:  icon('<div class="dmap-pin dmap-pickup"></div>', 22),
  dropoff: icon('<div class="dmap-pin dmap-dropoff"></div>', 22),
  driver:  icon('<div class="dmap-driver"><span></span></div>', 26),
}

/**
 * Live delivery map: the driver's own position, the current destination and
 * the driving route between them. Tiles are OpenStreetMap; in night mode
 * they're darkened with a CSS filter (see index.css .dmap).
 */
export const DeliveryMap = forwardRef<DeliveryMapHandle, Props>(function DeliveryMap(
  { target, targetKind, driver, route, bottomInset }, ref,
) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layers = useRef<{ target?: L.Marker; driver?: L.Marker; route?: L.Polyline; casing?: L.Polyline }>({})
  const userMoved = useRef(false)

  const fit = (force = false) => {
    const m = map.current
    if (!m || (userMoved.current && !force)) return
    const pts: L.LatLngExpression[] = []
    if (target) pts.push([target.lat, target.lng])
    if (driver) pts.push([driver.lat, driver.lng])
    if (!pts.length) return
    const pad = { paddingTopLeft: [40, 110] as L.PointTuple, paddingBottomRight: [40, bottomInset + 40] as L.PointTuple }
    if (pts.length === 1) {
      m.setView(pts[0], 15, { animate: true })
      m.panBy([0, bottomInset / 2], { animate: false })
    } else {
      m.fitBounds(L.latLngBounds(pts), { ...pad, maxZoom: 16, animate: true })
    }
    userMoved.current = false
  }

  useImperativeHandle(ref, () => ({ recenter: () => fit(true) }))

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { center: WINNIPEG, zoom: 13, zoomControl: false, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(m)
    m.attributionControl.setPrefix(false)
    m.on('dragstart zoomstart', (e: L.LeafletEvent) => {
      // Programmatic moves also fire zoomstart; only count gestures.
      if ((e as any).originalEvent || e.type === 'dragstart') userMoved.current = true
    })
    map.current = m
    // Forget layers that belonged to this map instance, so a remount re-adds
    // them instead of moving markers that are no longer on any map.
    return () => { m.remove(); map.current = null; layers.current = {} }
  }, [])

  // Target pin
  useEffect(() => {
    const m = map.current
    if (!m) return
    layers.current.target?.remove()
    layers.current.target = target
      ? L.marker([target.lat, target.lng], { icon: ICONS[targetKind], zIndexOffset: 500 }).addTo(m)
      : undefined
    userMoved.current = false
    fit()
  }, [target?.lat, target?.lng, targetKind])

  // Driver dot
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!driver) { layers.current.driver?.remove(); layers.current.driver = undefined; return }
    const first = !layers.current.driver
    if (layers.current.driver) layers.current.driver.setLatLng([driver.lat, driver.lng])
    else layers.current.driver = L.marker([driver.lat, driver.lng], { icon: ICONS.driver, zIndexOffset: 1000 }).addTo(m)
    if (first) fit()
  }, [driver?.lat, driver?.lng])

  // Route
  useEffect(() => {
    const m = map.current
    if (!m) return
    layers.current.casing?.remove()
    layers.current.route?.remove()
    if (route && route.length > 1) {
      layers.current.casing = L.polyline(route, { className: 'dmap-route-casing', weight: 9, opacity: 1 }).addTo(m)
      layers.current.route  = L.polyline(route, { className: 'dmap-route', weight: 5, opacity: 1 }).addTo(m)
    }
  }, [route])

  return <div ref={el} className="dmap" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
})
