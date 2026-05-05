import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { IconButton } from '../components/IconButton'
import { Back, Check, Phone, Send, Star } from '../components/Icons'
import { geocodeOnce, fetchRoute } from '../hooks/useGeocoder'
import { getOrderById, subscribeToOrderById, type CustomerOrder } from '../utils/orderStore'
import { getMessages, sendMessage, subscribeToMessages, markMessagesRead, type Message } from '../../../shared/utils/messageStore'
import type { CityConfig } from '../config/cityConfig'
import type { AuthUser, Draft, NavOptions, RouteInfo, ScreenName } from '../types'

interface Props {
  go:         (screen: ScreenName, opts?: NavOptions) => void
  draft:      Draft
  cityConfig: CityConfig
  orderId?:   string
  user?:      AuthUser | null
}

// ── Status helpers ────────────────────────────────────────────────────────────

type OrderStatus = CustomerOrder['status']

interface PhaseInfo { step: number; label: string; desc: string; terminal: boolean }

const PHASE_MAP: Record<OrderStatus, PhaseInfo> = {
  new:        { step: 0, label: 'Finding driver',    desc: 'Looking for a courier nearby',         terminal: false },
  assigned:   { step: 1, label: 'Driver assigned',   desc: 'Your driver is heading to pickup',      terminal: false },
  picked_up:  { step: 2, label: 'Picked up',         desc: 'Your parcel is on its way',             terminal: false },
  in_transit: { step: 3, label: 'In transit',        desc: 'Almost at the drop-off',               terminal: false },
  delivered:  { step: 4, label: 'Delivered',         desc: 'Package successfully delivered',        terminal: true  },
  cancelled:  { step: -1, label: 'Cancelled',        desc: 'This delivery was cancelled',           terminal: true  },
}

const PROGRESS_LABELS = ['Finding driver', 'Assigned', 'Picked up', 'In transit', 'Delivered']

// ── Map helpers ───────────────────────────────────────────────────────────────

function makeIcon(type: 'pickup' | 'dropoff' | 'driver') {
  const html = {
    pickup:  `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #0b1220;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    dropoff: `<div style="width:18px;height:18px;border-radius:3px;background:#c94a1b;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    driver:  `<div style="width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid #0b1220;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(11,18,32,.35)"><div style="width:9px;height:9px;border-radius:50%;background:#c94a1b"></div></div>`,
  }[type]
  const s: [number, number] = type === 'driver' ? [24, 24] : [18, 18]
  return L.divIcon({ html, className: '', iconSize: s, iconAnchor: [s[0] / 2, s[1] / 2] })
}

function circleBtnSt(bg: string, fg = 'var(--cs-ink)'): React.CSSProperties {
  return { width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
}

function interpolateCoords(coords: [number, number][], t: number, fallback: [number, number]): [number, number] {
  if (!coords.length) return fallback
  const idx = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 2)
  const frac = (t * (coords.length - 1)) - idx
  const a = coords[idx], b = coords[idx + 1] ?? coords[idx]
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({
  order,
  myId,
  myRole,
  onClose,
}: {
  order: CustomerOrder
  myId: string
  myRole: 'customer'
  onClose: () => void
}) {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [inputText,   setInputText]   = useState('')
  const [sending,     setSending]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'
  const canChat    = !!order.assignedDriverId && !isTerminal
  const driverName = order.assignedDriverName ?? 'Driver'

  // Initial load
  useEffect(() => {
    getMessages(order.id).then(msgs => {
      setMessages(msgs)
      markMessagesRead(order.id, myId).catch(() => {})
    })
  }, [order.id, myId])

  // Realtime
  useEffect(() => {
    const unsub = subscribeToMessages(order.id, (msgs) => {
      setMessages(msgs)
      markMessagesRead(order.id, myId).catch(() => {})
    })
    return unsub
  }, [order.id, myId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !order.assignedDriverId || sending) return
    setSending(true)
    setInputText('')
    await sendMessage({
      orderId:      order.id,
      senderId:     myId,
      senderRole:   'customer',
      receiverId:   order.assignedDriverId,
      receiverRole: 'driver',
      messageText:  text,
    })
    setSending(false)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'flex', flexDirection: 'column',
      background: 'var(--cs-paper)',
    }}>
      {/* Header */}
      <div style={{
        padding: '56px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff', borderBottom: '1px solid var(--cs-slate-100)', flexShrink: 0,
      }}>
        <IconButton onClick={onClose}><Back /></IconButton>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>
            {driverName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cs-slate-500)', marginTop: 1 }}>
            {isTerminal
              ? 'Order closed — read-only'
              : !order.assignedDriverId
                ? 'Driver not yet assigned'
                : 'CitySend Courier · ' + order.id}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', scrollbarWidth: 'none' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--cs-slate-400)', fontSize: 14 }}>
            No messages yet.
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === myId
            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px',
                  background: isMine ? 'var(--cs-ink)' : '#fff',
                  color: isMine ? '#fff' : 'var(--cs-ink)',
                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: 14, lineHeight: 1.45,
                  boxShadow: '0 1px 3px rgba(11,18,32,.08)',
                }}>
                  {msg.messageText}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--cs-slate-400)',
                  marginTop: 3, fontFamily: 'var(--cs-mono)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {fmtTime(msg.createdAt)}
                  {isMine && (
                    <span style={{ color: msg.isRead ? 'var(--cs-ok)' : 'var(--cs-slate-300)' }}>
                      {msg.isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px 36px', background: '#fff',
        borderTop: '1px solid var(--cs-slate-100)', flexShrink: 0,
      }}>
        {canChat ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Message your driver…"
              rows={1}
              style={{
                flex: 1, padding: '12px 14px',
                border: '1.5px solid var(--cs-slate-200)', borderRadius: 14,
                fontFamily: 'var(--cs-font)', fontSize: 15, color: 'var(--cs-ink)',
                background: '#fff', outline: 'none', resize: 'none',
                lineHeight: 1.4, maxHeight: 100, overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 22, border: 'none',
                background: inputText.trim() ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'default', flexShrink: 0,
                transition: 'background .15s',
              }}
            >
              <Send size={18} color={inputText.trim() ? '#fff' : 'var(--cs-slate-400)'} />
            </button>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '10px 0',
            fontSize: 13, color: 'var(--cs-slate-400)',
          }}>
            {isTerminal ? 'Chat is closed for completed orders.' : 'Chat available once a driver is assigned.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TrackingScreen ────────────────────────────────────────────────────────────

export function TrackingScreen({ go, draft, cityConfig, orderId, user }: Props) {
  const DEFAULT_CENTER: [number, number] = cityConfig.mapCenter

  // ── Order state ─────────────────────────────────────────────────────────────
  const [order,        setOrder]        = useState<CustomerOrder | null>(null)
  const [orderLoading, setOrderLoading] = useState(!!orderId)

  // ── Map / route state ────────────────────────────────────────────────────────
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(
    orderId ? null : (draft.route ?? null),
  )
  const [mapReady, setMapReady] = useState(false)

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [chatOpen,    setChatOpen]    = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<L.Map | null>(null)
  const pickupMarker    = useRef<L.Marker | null>(null)
  const dropoffMarker   = useRef<L.Marker | null>(null)
  const driverMarker    = useRef<L.Marker | null>(null)
  const routeLayer      = useRef<L.LayerGroup | null>(null)
  const animFrameRef    = useRef<number>(0)
  const progressRef     = useRef(0)

  // ── Fetch order ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) { setOrderLoading(false); return }
    let cancelled = false
    setOrderLoading(true)
    getOrderById(orderId).then(o => {
      if (cancelled) return
      setOrder(o ?? null)
      setOrderLoading(false)
    })
    return () => { cancelled = true }
  }, [orderId])

  // ── Realtime order subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return
    const unsub = subscribeToOrderById(orderId, (updated) => {
      setOrder(updated)
    })
    return unsub
  }, [orderId])

  // ── Unread badge — poll messages when order has driver assigned ───────────────
  useEffect(() => {
    if (!orderId || !user?.id) return
    const myId = user.id
    const unsub = subscribeToMessages(orderId, (msgs) => {
      const unread = msgs.filter(m => m.receiverId === myId && !m.isRead).length
      setUnreadCount(unread)
    })
    // Initial load
    getMessages(orderId).then(msgs => {
      setUnreadCount(msgs.filter(m => m.receiverId === myId && !m.isRead).length)
    })
    return unsub
  }, [orderId, user?.id])

  // ── Resolve addresses → route ─────────────────────────────────────────────
  useEffect(() => {
    if (routeInfo) return
    if (orderId && orderLoading) return
    if (orderId && !orderLoading && !order) return

    let cancelled = false
    ;(async () => {
      const puAddr  = order?.pickup.address  || draft.pickup.address  || ''
      const doAddr  = order?.dropoff.address || draft.dropoff.address || ''

      const pu  = (draft.pickup.lat  && !order) ? { lat: draft.pickup.lat,  lng: draft.pickup.lng! }
                : await geocodeOnce(puAddr, cityConfig)
      const do_ = (draft.dropoff.lat && !order) ? { lat: draft.dropoff.lat, lng: draft.dropoff.lng! }
                : await geocodeOnce(doAddr, cityConfig)

      if (cancelled) return

      const from = pu  ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
      const to   = do_ ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }

      const route = await fetchRoute(from, to)
      if (!cancelled) {
        setRouteInfo(route ?? {
          distanceM: 3200,
          durationS: 600,
          coords: [
            [from.lat, from.lng],
            [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2],
            [to.lat, to.lng],
          ],
        })
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderLoading, order?.id])

  // ── Init Leaflet ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER, zoom: 14,
      zoomControl: false, attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OSM</a>', maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    routeLayer.current = L.layerGroup().addTo(map)
    setMapReady(true)
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Draw route + markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !routeInfo || !mapReady) return

    const { coords } = routeInfo
    const pickupCoords  = coords[0]
    const dropoffCoords = coords[coords.length - 1]

    routeLayer.current?.clearLayers()
    L.polyline(coords, { color: '#0b1220', weight: 5, opacity: 0.9 }).addTo(routeLayer.current!)
    L.polyline(coords, { color: '#c94a1b', weight: 2, dashArray: '6 8', opacity: 1 }).addTo(routeLayer.current!)

    if (!pickupMarker.current)  pickupMarker.current  = L.marker(pickupCoords,  { icon: makeIcon('pickup')  }).addTo(map)
    if (!dropoffMarker.current) dropoffMarker.current = L.marker(dropoffCoords, { icon: makeIcon('dropoff') }).addTo(map)
    if (!driverMarker.current)  driverMarker.current  = L.marker(pickupCoords,  { icon: makeIcon('driver')  }).addTo(map)

    map.fitBounds(L.latLngBounds([pickupCoords, dropoffCoords]), { padding: [70, 70] })
  }, [routeInfo, mapReady])

  // ── Animate driver ────────────────────────────────────────────────────────────
  useEffect(() => {
    const status = order?.status ?? 'new'
    if (!routeInfo || !mapReady || status === 'delivered' || status === 'cancelled') return

    const coords = routeInfo.coords
    const totalDurationMs = 12000
    let start: number | null = null

    const animate = (timestamp: number) => {
      if (!start) start = timestamp
      const t = Math.min((timestamp - start) / totalDurationMs, 1)
      progressRef.current = t
      driverMarker.current?.setLatLng(interpolateCoords(coords, t, DEFAULT_CENTER))
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeInfo, mapReady, order?.status])

  // ── Derive display values ─────────────────────────────────────────────────────
  const status    = order?.status ?? 'new'
  const phase     = PHASE_MAP[status] ?? PHASE_MAP['new']
  const distKm    = routeInfo ? (routeInfo.distanceM / 1000).toFixed(1) : '—'
  const etaMins   = routeInfo ? Math.max(2, Math.round(routeInfo.durationS / 60 * (1 - progressRef.current))) : null

  const driverName     = order?.assignedDriverName ?? (status === 'new' ? 'Matching…' : 'CitySend Courier')
  const driverInitials = (order?.assignedDriverName) ? getInitials(order.assignedDriverName) : '?'

  const pickupAddr  = order?.pickup.address  || draft.pickup.address  || '—'
  const dropoffAddr = order?.dropoff.address || draft.dropoff.address || '—'

  const myId = user?.id ?? order?.customerId ?? 'guest'
  // Chat available when driver is assigned (even after delivery for read-only view)
  const chatAvailable = !!order?.assignedDriverId

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!orderId && !draft.pickup.address && !draft.dropoff.address) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cs-paper)', padding: 32, gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={24} color="var(--cs-slate-400)" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--cs-ink)', textAlign: 'center' }}>No active delivery</div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', textAlign: 'center', lineHeight: 1.5 }}>
          Place a new delivery to track it here.
        </div>
        <button
          onClick={() => go('home')}
          style={{ marginTop: 8, padding: '12px 28px', background: 'var(--cs-ink)', color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Back to home
        </button>
      </div>
    )
  }

  // ── Order not found ───────────────────────────────────────────────────────────
  if (orderId && !orderLoading && !order) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cs-paper)', padding: 32, gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={26} color="var(--cs-slate-400)" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cs-ink)', textAlign: 'center', letterSpacing: -0.4 }}>
          Delivery not found
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', textAlign: 'center', lineHeight: 1.55, maxWidth: 268 }}>
          We couldn't find this delivery. The link may be incorrect, or the order may have been removed.
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--cs-slate-100)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', letterSpacing: 0.4 }}>
            {orderId}
          </span>
        </div>
        <button
          onClick={() => go('home')}
          style={{ marginTop: 4, padding: '13px 32px', background: 'var(--cs-ink)', color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Back to home
        </button>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  const showLoadingOverlay = (orderId && orderLoading) || !routeInfo

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Map */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Loading overlay */}
      {showLoadingOverlay && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,251,252,.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--cs-slate-200)', borderTopColor: 'var(--cs-ink)', borderRadius: 14, animation: 'cs-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>
              {orderLoading ? 'Loading order…' : 'Getting route…'}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '56px 16px 0', display: 'flex', gap: 10, zIndex: 10 }}>
        <IconButton onClick={() => go('home')} glass><Back /></IconButton>
        <div style={{ flex: 1 }} />
        {order && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--cs-slate-100)' }}>
            <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', letterSpacing: 0.5 }}>{order.id}</span>
          </div>
        )}
      </div>

      {/* ETA pill — only for active orders */}
      {!phase.terminal && (
        <div style={{ position: 'absolute', top: 116, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{
            background: 'var(--cs-ink)', color: '#fff', padding: '10px 18px', borderRadius: 999,
            fontFamily: 'var(--cs-mono)', fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
            boxShadow: '0 10px 30px -10px rgba(11,18,32,.6)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--cs-accent)', animation: 'cs-pulse 1.4s ease-in-out infinite' }} />
            {etaMins ? `ETA ${etaMins} min` : 'Calculating…'}
            {distKm !== '—' && <span style={{ opacity: 0.55 }}>· {distKm} km</span>}
          </div>
        </div>
      )}

      {/* Delivered banner */}
      {status === 'delivered' && (
        <div style={{ position: 'absolute', top: 116, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{
            background: '#167842', color: '#fff', padding: '10px 20px', borderRadius: 999,
            fontFamily: 'var(--cs-mono)', fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
            boxShadow: '0 10px 30px -10px rgba(22,120,66,.5)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
            <Check size={14} color="#fff" /> Delivered
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: '#fff', borderRadius: '22px 22px 0 0',
        boxShadow: '0 -20px 50px -20px rgba(11,18,32,.2)', paddingBottom: 36,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--cs-slate-200)' }} />
        </div>

        {/* Cancelled state */}
        {status === 'cancelled' ? (
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#FFF5F5', borderRadius: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: '#FFE5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>✕</span>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.3 }}>Delivery cancelled</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 3 }}>
                  {order?.cancelReason ?? 'This delivery was cancelled.'}
                </div>
              </div>
            </div>
            <button
              onClick={() => go('home')}
              style={{ width: '100%', marginTop: 14, padding: '14px 0', background: 'var(--cs-ink)', color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'var(--cs-font)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
            >
              Back to home
            </button>
          </div>
        ) : (
          <>
            {/* Progress rail */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {PROGRESS_LABELS.map((lbl, i) => (
                  <React.Fragment key={i}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 5, flexShrink: 0,
                      background: i <= phase.step ? (status === 'delivered' ? '#167842' : 'var(--cs-ink)') : 'var(--cs-slate-200)',
                      outline: i === phase.step && !phase.terminal ? '2px solid var(--cs-ink)' : (status === 'delivered' && i === 4 ? '2px solid #167842' : 'none'),
                      outlineOffset: 2,
                      transform: (i === phase.step && !phase.terminal) ? 'scale(1.4)' : 'scale(1)',
                      transition: 'all .3s',
                    }} />
                    {i < PROGRESS_LABELS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < phase.step ? (status === 'delivered' ? '#167842' : 'var(--cs-ink)') : 'var(--cs-slate-200)', transition: 'background .3s' }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.2, textTransform: 'uppercase' }}>{phase.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, color: status === 'delivered' ? '#167842' : 'var(--cs-ink)', marginTop: 4 }}>{phase.desc}</div>
            </div>

            {/* Courier card */}
            <div style={{ padding: '18px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--cs-paper)', borderRadius: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 26, background: 'linear-gradient(135deg,#2b3548,#5b657a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                  {status === 'new' ? '…' : driverInitials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>{driverName}</div>
                  <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {status !== 'new' && <><Star size={12} color="var(--cs-accent)" fill="currentColor" />5.0 · </>}
                    CitySend Courier
                  </div>
                </div>
                {status !== 'new' && (
                  <>
                    <button style={circleBtnSt('var(--cs-slate-100)')}><Phone size={16} /></button>
                    {/* Chat button with unread badge */}
                    <button
                      onClick={() => setChatOpen(true)}
                      disabled={!chatAvailable}
                      style={{
                        ...circleBtnSt(chatAvailable ? 'var(--cs-ink)' : 'var(--cs-slate-100)', chatAvailable ? '#fff' : 'var(--cs-slate-400)'),
                        position: 'relative',
                      }}
                    >
                      <Send size={16} color={chatAvailable ? '#fff' : 'var(--cs-slate-400)'} />
                      {unreadCount > 0 && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 8, height: 8, borderRadius: 4,
                          background: 'var(--cs-accent)',
                          border: '1.5px solid var(--cs-ink)',
                        }} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Route mini */}
            <div style={{ padding: '14px 20px 0', display: 'flex', gap: 12, fontSize: 13, color: 'var(--cs-slate-700)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: phase.step >= 2 ? 'var(--cs-slate-300)' : 'var(--cs-ink)' }} />
                <div style={{ width: 1, flex: 1, background: 'var(--cs-slate-200)', margin: '3px 0', minHeight: 18 }} />
                <div style={{ width: 8, height: 8, background: 'var(--cs-accent)', borderRadius: 1 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ paddingBottom: 10, textDecoration: phase.step >= 2 ? 'line-through' : 'none', opacity: phase.step >= 2 ? 0.45 : 1, transition: 'opacity .4s' }}>
                  {pickupAddr}
                </div>
                <div>{dropoffAddr}</div>
              </div>
              {order && (
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', alignSelf: 'flex-end' }}>
                  {order.id}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat overlay */}
      {chatOpen && order && (
        <ChatPanel
          order={order}
          myId={myId}
          myRole="customer"
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
