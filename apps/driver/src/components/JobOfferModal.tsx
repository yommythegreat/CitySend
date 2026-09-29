import React, { useState, useEffect } from 'react'
import { DELIVERY_WINDOW_LABELS } from '@shared/types'
import type { Order } from '@shared/types'
import { payoutBreakdown } from '../utils/payout'
import { subscribePosition, type Fix } from '../lib/locationBroadcast'
import { formatDistance } from '../utils/proximity'
import { haptic } from '../lib/haptics'
import { Button, Icon, money } from '../ui'

interface Props {
  order:     Order
  onAccept:  () => void
  onDecline: () => void
  onTimeout: () => void
  /** Initial countdown seconds. Defaults to 120; pass a smaller value to
   *  restore an in-progress offer after page reload. */
  initialSeconds?: number
}

const OFFER_SECONDS = 120
const SIZE: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000, rad = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'accent' | 'warn' }) {
  const t = tone === 'accent' ? { background: 'var(--d-accent-lt)', color: 'var(--d-accent)' }
          : tone === 'warn'   ? { background: 'var(--d-warn-bg)',   color: 'var(--d-warn)' }
          :                     { background: 'var(--d-surface-2)', color: 'var(--d-ink-2)' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 14, fontSize: 13, fontWeight: 600, ...t }}>{children}</span>
}

/** Full-screen job offer: payout first, the route, a countdown, and two clear choices. */
export function JobOfferModal({ order, onAccept, onDecline, onTimeout, initialSeconds = OFFER_SECONDS }: Props) {
  const [t, setT] = useState(initialSeconds)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [me, setMe] = useState<Fix | null>(null)

  // Alert the driver even if they're not looking at the screen.
  useEffect(() => { haptic('warning'); const id = setTimeout(() => haptic('warning'), 700); return () => clearTimeout(id) }, [])
  useEffect(() => subscribePosition(setMe), [])

  useEffect(() => {
    if (t <= 0) { onTimeout(); return }
    const id = setTimeout(() => setT(prev => prev - 1), 1000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  const pay = payoutBreakdown(order)
  const slot = order.parcel.deliveryWindow
  const isExpress = slot === 'express' || order.deliveryType === 'express'
  const toPickup = me && order.pickup.lat != null && order.pickup.lng != null
    ? metersBetween(me, { lat: order.pickup.lat, lng: order.pickup.lng })
    : null

  const radius = 26
  const circumference = 2 * Math.PI * radius
  const urgent = t <= 20

  return (
    <div role="dialog" aria-label="New delivery offer" style={{
      position: 'absolute', inset: 0, zIndex: 300, background: 'var(--d-bg)', color: 'var(--d-ink)',
      display: 'flex', flexDirection: 'column', animation: 'd-fade-in .2s ease',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 16px 16px' }}>
        <div className="d-stack" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header: label + countdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 650, color: 'var(--d-accent)' }}>
                <span style={{ position: 'relative', width: 8, height: 8 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'var(--d-accent)', animation: 'd-ping 1.4s ease-out infinite' }} />
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'var(--d-accent)' }} />
                </span>
                New delivery
              </div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>{order.id}</div>
            </div>
            <div style={{ position: 'relative', width: 64, height: 64 }} aria-label={`${t} seconds left`}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--d-border)" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r={radius} fill="none"
                  style={{ stroke: urgent ? 'var(--d-err)' : 'var(--d-accent)', transition: 'stroke-dashoffset 1s linear' }}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - t / OFFER_SECONDS)}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--d-mono)', fontSize: 15, fontWeight: 600, color: urgent ? 'var(--d-err)' : 'var(--d-ink)',
              }}>
                {Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Payout */}
          <div>
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2.4, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {money(pay.total)}
            </div>
            <div style={{ fontSize: 15, color: 'var(--d-muted)', marginTop: 8 }}>
              You earn{pay.tip > 0 ? `, including a ${money(pay.tip)} tip` : ''} · {order.distanceKm.toFixed(1)} km trip
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone={isExpress ? 'accent' : undefined}>
              {slot ? DELIVERY_WINDOW_LABELS[slot] : isExpress ? 'Express' : 'Standard'}
            </Chip>
            <Chip>{SIZE[order.parcel.size] ?? 'Medium'} parcel</Chip>
            {order.parcel.fragile && <Chip tone="warn"><Icon name="alert" size={14} /> Fragile</Chip>}
          </div>

          {/* Route */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 20, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 12, rowGap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--d-ink)' }} />
                <span style={{ flex: 1, width: 2, background: 'var(--d-border)', margin: '4px 0 -16px' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>
                  Pickup{toPickup != null ? ` · ${formatDistance(toPickup)} from you` : ''}
                </div>
                <div style={{ fontSize: 17, fontWeight: 650, marginTop: 1 }}>{order.pickup.address.split(',')[0]}</div>
                <div style={{ fontSize: 14, color: 'var(--d-muted)' }}>{order.pickup.name}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--d-accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>Drop-off</div>
                <div style={{ fontSize: 17, fontWeight: 650, marginTop: 1 }}>
                  {order.dropoff.address.split(',')[0]}{order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}
                </div>
                <div style={{ fontSize: 14, color: 'var(--d-muted)' }}>{order.dropoff.name}</div>
              </div>
            </div>
            {order.parcel.desc && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--d-border)', fontSize: 14, color: 'var(--d-ink-2)' }}>
                <Icon name="box" size={16} /> {order.parcel.desc}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <Button size="xl" icon="check" onClick={onAccept}>Accept · {money(pay.total)}</Button>
        <Button variant="ghost" onClick={() => setConfirmDecline(true)}>Decline</Button>
      </div>

      {confirmDecline && (
        <div onClick={() => setConfirmDecline(false)} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'var(--d-overlay)', display: 'flex', alignItems: 'flex-end', animation: 'd-fade-in .18s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', background: 'var(--d-surface)', borderRadius: '24px 24px 0 0',
            padding: '22px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', animation: 'd-slide-up .22s ease',
          }}>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4, margin: '0 4px' }}>Decline this job?</div>
            <div style={{ fontSize: 14, color: 'var(--d-ink-2)', lineHeight: 1.5, margin: '6px 4px 18px' }}>
              It goes back to dispatch to offer to another courier.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="danger" onClick={onDecline}>Yes, decline</Button>
              <Button variant="ghost" onClick={() => setConfirmDecline(false)}>Keep the offer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
