import React, { useState, useMemo, useEffect } from 'react'
import { useDriver } from '../store/DriverContext'
import type { Order } from '@shared/types'
import { driverPayout } from '../utils/payout'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import { Button, Card, Icon, money } from '../ui'
import { PayoutRows } from '../components/PayoutRows'
import { haptic } from '../lib/haptics'

interface Props {
  order:      Order
  onContinue: () => void
}

const onlineKey = (driverId: string) => `cs_driver_online_${driverId}`

/** Delivery complete: what you earned, today's running total, optional rating. */
export function EarningsScreen({ order, onContinue }: Props) {
  const { completedOrders, state } = useDriver()
  const [rating, setRating] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { haptic('success') }, [])

  const earned = driverPayout(order)
  const today = useMemo(() => {
    const key = new Date().toDateString()
    const list = completedOrders.filter(o => o.status === 'delivered' && new Date(o.updatedAt).toDateString() === key)
    const withThis = list.some(o => o.id === order.id) ? list : [...list, order]
    return { count: withThis.length, total: withThis.reduce((s, o) => s + driverPayout(o), 0) }
  }, [completedOrders, order])

  const deliveredAt = new Date(order.updatedAt).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
  const firstName = order.customerName?.split(' ')[0]

  // Rating is optional: only sent if the driver actually tapped a star.
  const finish = async (endShift: boolean) => {
    if (leaving) return
    setLeaving(true)
    if (isSupabaseConfigured) {
      if (rating > 0) {
        try { await supabase.from('orders').update({ driver_rating: rating }).eq('id', order.id) } catch { /* non-critical */ }
      }
      if (endShift && state.auth?.driverId) {
        try { await supabase.from('drivers').update({ status: 'offline' }).eq('id', state.auth.driverId) } catch {}
      }
    }
    if (endShift && state.auth?.driverId) {
      try { localStorage.setItem(onlineKey(state.auth.driverId), 'false') } catch {}
    }
    onContinue()
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--d-bg)', color: 'var(--d-ink)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div className="d-stack" style={{ flex: 1, padding: 'calc(env(safe-area-inset-top, 0px) + 40px) 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Done */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'd-rise .35s ease' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--d-ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--d-ok)', color: 'var(--d-on-ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} stroke={3} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>Delivered</div>
          <div style={{ fontSize: 15, color: 'var(--d-muted)', marginTop: 4 }}>
            {order.dropoff.address.split(',')[0]} · {deliveredAt}
          </div>
        </div>

        {/* Earned */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.6, lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 18 }}>
            {money(earned)}
          </div>
          <PayoutRows order={order} />
        </Card>

        {/* Today */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--d-accent-lt)', color: 'var(--d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="wallet" size={19} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>Today so far</div>
              <div style={{ fontSize: 17, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                {money(today.total)} · {today.count} {today.count === 1 ? 'delivery' : 'deliveries'}
              </div>
            </div>
          </div>
        </Card>

        {/* Rating (optional) */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>How was {firstName ?? 'the sender'}?</div>
          <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>Optional. Only the rating is shared.</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }} role="radiogroup" aria-label="Rate the sender">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => { haptic('tap'); setRating(rating === n ? 0 : n) }}
                style={{
                  flex: 1, height: 48, borderRadius: 12, cursor: 'pointer', background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: n <= rating ? '#f5a524' : 'var(--d-border)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 26 26" fill="currentColor"><path d="M13 2l2.9 8.3H24l-7.1 5.1 2.7 8.3L13 18.9l-6.6 4.8 2.7-8.3L2 10.3h8.1z"/></svg>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: '8px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Button size="xl" onClick={() => finish(false)} disabled={leaving}>Back to jobs</Button>
        <Button variant="ghost" onClick={() => finish(true)} disabled={leaving}>End shift and go offline</Button>
      </div>
    </div>
  )
}
