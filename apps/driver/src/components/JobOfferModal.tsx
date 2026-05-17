import React, { useState, useEffect } from 'react'
import type { Order } from '@shared/types'

interface Props {
  order:     Order
  onAccept:  () => void
  onDecline: () => void
  onTimeout: () => void
}

/**
 * JobOfferModal — Full-screen job offer with countdown ring.
 * Design matches DOfferScreen from driver-screens.jsx prototype.
 */
export function JobOfferModal({ order, onAccept, onDecline, onTimeout }: Props) {
  const [t, setT] = useState(15)

  useEffect(() => {
    if (t <= 0) { onTimeout(); return }
    const id = setTimeout(() => setT(prev => prev - 1), 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  const pct         = t / 15
  const radius      = 42
  const circumf     = 2 * Math.PI * radius
  const dashOffset  = circumf * (1 - pct)

  const pickupAddr  = order.pickup.address.split(',')[0]
  const dropoffAddr = order.dropoff.address.split(',')[0]
  const distanceKm  = order.distanceKm
  const payout      = (5.99 + distanceKm * 1.5).toFixed(2)
  const [dollars, cents] = payout.split('.')

  const fragile = order.parcel.fragile
  const size    = order.parcel.size === 's' ? 'Small' : order.parcel.size === 'l' ? 'Large' : 'Medium'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#111827',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Dim map peek */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.15, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <iframe
          title="map-peek"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(order.pickup.address)}&t=m&z=14&output=embed&iwloc=near`}
          style={{ width: '100%', height: '100%', border: 'none', filter: 'grayscale(1)' }}
        />
      </div>

      {/* Timer ring */}
      <div style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        <div style={{ padding: 'max(64px, env(safe-area-inset-top, 64px)) 20px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6"/>
              <circle
                cx="48" cy="48" r={radius}
                fill="none" stroke="#c94a1b" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${circumf}`}
                strokeDashoffset={`${dashOffset}`}
                transform="rotate(-90 48 48)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1, fontFamily: 'monospace' }}>{t}</div>
              <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', fontFamily: 'monospace' }}>seconds</div>
            </div>
          </div>
        </div>

        {/* White bottom sheet */}
        <div style={{
          background: '#fff', borderRadius: '24px 24px 0 0',
          padding: '24px 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
          boxShadow: '0 -20px 50px -20px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {/* NEW tag + order ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#fef2f0', borderRadius: 99, padding: '4px 10px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#c94a1b' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c94a1b', letterSpacing: 1, textTransform: 'uppercase' }}>NEW</span>
            </div>
            <span style={{
              fontFamily: 'monospace', fontSize: 11, color: '#6b7280',
              letterSpacing: 1, textTransform: 'uppercase',
            }}>{order.id} · Standard</span>
          </div>

          {/* Payout */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: -2, color: '#111827', lineHeight: 1 }}>
              ${dollars}<span style={{ fontSize: 28, color: '#9ca3af' }}>.{cents}</span>
            </div>
            <div style={{ paddingBottom: 8, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              <div><b style={{ color: '#111827' }}>{distanceKm.toFixed(1)} km</b> · ~{Math.round(distanceKm * 4 + 10)} min</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11 }}>80% to you</div>
            </div>
          </div>

          {/* Route mini card */}
          <div style={{ background: '#f9fafb', borderRadius: 14, padding: 14, display: 'flex', gap: 14 }}>
            {/* Route line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid #111827' }} />
              <div style={{ width: 2, flex: 1, background: '#e5e7ea', margin: '3px 0', minHeight: 22 }} />
              <div style={{ width: 10, height: 10, background: '#c94a1b', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Pickup · {Math.round(distanceKm * 0.6 + 2)} min away
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{pickupAddr}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{order.pickup.name}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>Drop-off</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{dropoffAddr}{order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{order.dropoff.name}</div>
              </div>
            </div>
          </div>

          {/* Parcel tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>{size} · {order.parcel.size === 's' ? '~5 lb' : order.parcel.size === 'l' ? '~25 lb' : '~10 lb'}</Tag>
            {fragile && <Tag tone="warn">⚠ Fragile</Tag>}
            {order.parcel.desc && <Tag tone="neutral">{order.parcel.desc.slice(0, 24)}</Tag>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onDecline}
              style={{
                flex: 1, height: 52, borderRadius: 26, cursor: 'pointer',
                background: '#f3f4f6', border: 'none', color: '#111827',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
              }}
            >Decline</button>
            <button
              onClick={onAccept}
              style={{
                flex: 2, height: 52, borderRadius: 26, cursor: 'pointer',
                background: '#c94a1b', border: 'none', color: '#fff',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 24px -10px rgba(201,74,27,.5)',
              }}
            >
              Accept · ${payout}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline tag component ──────────────────────────────────────────────────────

function Tag({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'warn' | 'neutral' }) {
  const colors: Record<string, { bg: string; color: string }> = {
    default: { bg: '#f3f4f6',  color: '#374151' },
    warn:    { bg: '#fef3c7',  color: '#92400e' },
    neutral: { bg: '#ede9fe',  color: '#5b21b6' },
  }
  const { bg, color } = colors[tone]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, color, borderRadius: 99,
      padding: '4px 10px', fontSize: 12, fontWeight: 500,
    }}>
      {children}
    </div>
  )
}
