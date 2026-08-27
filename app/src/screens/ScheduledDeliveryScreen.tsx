import React, { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Check, Clock, Package } from '../components/Icons'
import { DeliveryTimeline } from '../components/DeliveryTimeline'
import { HandoffCodeCard } from '../components/HandoffCodeCard'
import { getOrderById, subscribeToOrderById, type CustomerOrder } from '../utils/orderStore'
import { fmt } from '../utils/pricing'
import { DELIVERY_WINDOWS } from '../config/cityConfig'
import type { CityConfig } from '../config/cityConfig'
import type { NavOptions, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName, opts?: NavOptions) => void
  orderId?: string
  cityConfig: CityConfig
}

/**
 * ScheduledDeliveryScreen — post-payment confirmation for Morning/Evening
 * bookings. Deliberately NOT the live tracking experience: no map, no ETA, no
 * courier card. Shows the booked window (with real date), the order summary,
 * and a timeline. Primary CTA "View Delivery" → the tracking screen (which
 * stays timeline-first until a courier is assigned).
 */
export function ScheduledDeliveryScreen({ go, orderId, cityConfig }: Props) {
  const [order, setOrder] = useState<CustomerOrder | null>(null)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    getOrderById(orderId).then(o => { if (!cancelled && o) setOrder(o) })
    const unsub = subscribeToOrderById(orderId, (o) => setOrder(o))
    return () => { cancelled = true; unsub() }
  }, [orderId])

  const windowId = (order?.deliveryType ?? order?.parcel?.deliveryWindow ?? 'morning') as 'morning' | 'evening' | 'express'
  const opt = DELIVERY_WINDOWS.find(w => w.id === windowId)
  const start = order?.deliveryWindowStart ? new Date(order.deliveryWindowStart) : null
  const dateLabel = start
    ? start.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
    : ''

  const status = (order?.status ?? 'scheduled') as any

  return (
    <div className="cs-screen cs-enter-right" style={{ background: 'var(--cs-slate-50, #f8f9fb)' }}>
      {/* Hero */}
      <div style={{ padding: '64px 20px 20px', flexShrink: 0, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 28, margin: '0 auto 16px',
          background: 'rgba(22,120,66,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#167842', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={20} color="#fff" />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Booking Confirmed
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cs-ink)', letterSpacing: -0.6, marginTop: 6 }}>
          {opt?.label ?? 'Morning'} Delivery
        </div>
        <div style={{ fontSize: 15, color: 'var(--cs-ink)', fontWeight: 500, marginTop: 2 }}>
          {opt?.time ?? '10 AM – 2 PM'}
        </div>
        {dateLabel && (
          <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{dateLabel}</div>
        )}
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 12, lineHeight: 1.5, maxWidth: 320, marginInline: 'auto' }}>
          Your delivery has been scheduled. We'll assign a CitySend courier closer to your delivery window.
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Handoff code — the key action on this screen, shown first so it's
            visible without scrolling past the timeline */}
        {order?.handoffCode && (
          <HandoffCodeCard
            code={order.handoffCode}
            recipientPhone={order.dropoff?.phone}
            recipientName={order.dropoff?.name}
            deliveryType={order.deliveryType ?? order.parcel?.deliveryWindow}
            windowStart={order.deliveryWindowStart}
            style={{ marginBottom: 10 }}
          />
        )}

        {/* Timeline */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--cs-slate-100)', padding: 18, marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Delivery timeline
          </div>
          <DeliveryTimeline status={status} />
        </div>

        {/* Route */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--cs-slate-100)', padding: 18, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--cs-ink)' }} />
              <div style={{ width: 2, flex: 1, background: 'var(--cs-slate-200)', margin: '3px 0', minHeight: 26 }} />
              <div style={{ width: 10, height: 10, background: 'var(--cs-accent)', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{order?.pickup?.address ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Drop-off</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{order?.dropoff?.address ?? '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{order?.dropoff?.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--cs-slate-100)', padding: 18, marginBottom: 20 }}>
          {[
            { label: 'Reference', value: order?.id ?? orderId ?? '—' },
            { label: 'Parcel',    value: `${order?.parcel?.size === 's' ? 'Small' : order?.parcel?.size === 'l' ? 'Large' : 'Medium'}${order?.parcel?.fragile ? ' · Fragile' : ''}` },
            { label: 'Window',    value: `${opt?.label ?? 'Morning'} · ${opt?.time ?? '10 AM – 2 PM'}${dateLabel ? ' · ' + dateLabel : ''}` },
            { label: 'Price',     value: order ? fmt(order.priceBreakdown.total) : '—' },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0', borderTop: i > 0 ? '1px solid var(--cs-slate-100)' : 'none', fontSize: 14,
            }}>
              <span style={{ color: 'var(--cs-slate-500)' }}>{row.label}</span>
              <span style={{ color: 'var(--cs-ink)', fontWeight: 500, fontFamily: row.label === 'Reference' || row.label === 'Price' ? 'var(--cs-mono)' : undefined }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff', flexShrink: 0 }}>
        <Button kind="ink" size="lg" full onClick={() => go('tracking', { trackOrderId: order?.id ?? orderId })}>
          View Delivery
        </Button>
      </div>
    </div>
  )
}
