import React, { useState, useMemo } from 'react'
import { useDriver } from '../store/DriverContext'
import type { Order } from '@shared/types'
import { driverPayout } from '../utils/payout'
import { Card, Icon, money } from '../ui'
import { PayoutRows } from '../components/PayoutRows'
import { haptic } from '../lib/haptics'

interface Props {
  onSelectOrder: (orderId: string) => void
}

type Filter = 'all' | 'delivered' | 'cancelled'
const SIZE_LABEL: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }
const street = (a: string) => a.split(',')[0]

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })

function Row({ order, first, onOpen }: { order: Order; first: boolean; onOpen: () => void }) {
  const cancelled = order.status === 'cancelled'
  return (
    <button className="d-press" onClick={() => { haptic('tap'); onOpen() }} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'left',
      background: 'none', border: 'none', borderTop: first ? 'none' : '1px solid var(--d-border)', cursor: 'pointer', color: 'var(--d-ink)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18, flexShrink: 0,
        background: cancelled ? 'var(--d-surface-2)' : 'var(--d-ok-bg)', color: cancelled ? 'var(--d-muted)' : 'var(--d-ok)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={cancelled ? 'alert' : 'box'} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{street(order.dropoff.address)}</div>
        <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>{cancelled ? 'Cancelled' : 'Delivered'} · {time(order.updatedAt)}</div>
      </div>
      <div style={{
        fontSize: 15, fontWeight: 650, fontVariantNumeric: 'tabular-nums',
        color: cancelled ? 'var(--d-muted-lt)' : 'var(--d-ink)', textDecoration: cancelled ? 'line-through' : 'none',
      }}>{money(driverPayout(order))}</div>
      <span style={{ color: 'var(--d-muted-lt)' }}><Icon name="chevron" size={16} /></span>
    </button>
  )
}

function DetailSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const cancelled = order.status === 'cancelled'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--d-overlay)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'd-fade-in .18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, background: 'var(--d-surface)', color: 'var(--d-ink)', borderRadius: '24px 24px 0 0',
        padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)', maxHeight: '85vh', overflowY: 'auto', animation: 'd-slide-up .22s ease',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--d-border)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 4px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>{order.id} · {dayLabel(order.updatedAt)}, {time(order.updatedAt)}</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{cancelled ? 'Cancelled' : 'Delivered'}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: 'var(--d-surface-2)', color: 'var(--d-ink)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--d-surface-2)', borderRadius: 16, padding: 16, display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 12, rowGap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--d-ink)' }} />
              <span style={{ flex: 1, width: 2, background: 'var(--d-border)', margin: '4px 0 -14px' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{street(order.pickup.address)}</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>Pickup · {order.pickup.name}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--d-accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{street(order.dropoff.address)}{order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>Drop-off · {order.dropoff.name}</div>
            </div>
          </div>

          {cancelled ? (
            <div style={{ background: 'var(--d-surface-2)', borderRadius: 16, padding: 16, fontSize: 14, color: 'var(--d-ink-2)' }}>
              No earnings for cancelled deliveries.
            </div>
          ) : (
            <div style={{ background: 'var(--d-surface-2)', borderRadius: 16, padding: 16 }}>
              <PayoutRows order={order} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 4px', fontSize: 13, color: 'var(--d-muted)' }}>
            <span>{order.distanceKm.toFixed(1)} km</span>·
            <span>{SIZE_LABEL[order.parcel.size] ?? 'Medium'} parcel</span>
            {order.parcel.desc && <>·<span>{order.parcel.desc}</span></>}
            {order.parcel.fragile && <>·<span style={{ color: 'var(--d-warn)' }}>Fragile</span></>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoryScreen(_: Props) {
  const { completedOrders } = useDriver()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Order | null>(null)

  const delivered = completedOrders.filter(o => o.status === 'delivered')
  const cancelledCount = completedOrders.length - delivered.length
  const totalEarned = delivered.reduce((s, o) => s + driverPayout(o), 0)
  const totalTips = delivered.reduce((s, o) => s + o.priceBreakdown.tip, 0)

  const groups = useMemo(() => {
    const list = filter === 'all' ? completedOrders : completedOrders.filter(o => o.status === filter)
    const out: { label: string; orders: Order[]; total: number }[] = []
    for (const o of list) {
      const label = dayLabel(o.updatedAt)
      let g = out[out.length - 1]
      if (!g || g.label !== label) { g = { label, orders: [], total: 0 }; out.push(g) }
      g.orders.push(o)
      if (o.status === 'delivered') g.total += driverPayout(o)
    }
    return out
  }, [completedOrders, filter])

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: `All ${completedOrders.length}` },
    { id: 'delivered', label: `Delivered ${delivered.length}` },
    { id: 'cancelled', label: `Cancelled ${cancelledCount}` },
  ]

  return (
    <div className="d-scroll" style={{ color: 'var(--d-ink)' }}>
      <div className="d-stack" style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Summary */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>Earned, last 90 days</div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{money(totalEarned)}</div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 6 }}>
            {delivered.length} {delivered.length === 1 ? 'delivery' : 'deliveries'}{totalTips > 0 ? ` · ${money(totalTips)} in tips` : ''}
          </div>
        </Card>

        {/* Filter */}
        <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'var(--d-surface-2)', border: '1px solid var(--d-border)' }}>
          {FILTERS.map(f => {
            const on = filter === f.id
            return (
              <button key={f.id} role="tab" aria-selected={on} onClick={() => { haptic('tap'); setFilter(f.id) }} style={{
                flex: 1, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: on ? 650 : 500,
                background: on ? 'var(--d-surface)' : 'transparent', color: on ? 'var(--d-ink)' : 'var(--d-muted)',
                boxShadow: on ? 'var(--d-shadow)' : 'none',
              }}>{f.label}</button>
            )
          })}
        </div>

        {/* List, by day */}
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--d-muted)' }}>
            <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 28, background: 'var(--d-surface-2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="box" size={24} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--d-ink)' }}>
              {filter === 'cancelled' ? 'No cancelled deliveries' : 'No deliveries yet'}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {filter === 'cancelled' ? 'Nice.' : 'Completed jobs will show up here.'}
            </div>
          </div>
        ) : groups.map(g => (
          <section key={g.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 4px 10px' }}>
              <div style={{ fontFamily: 'var(--d-mono)', fontSize: 11, fontWeight: 500, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--d-muted)' }}>{g.label}</div>
              {g.total > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', fontVariantNumeric: 'tabular-nums' }}>{money(g.total)}</div>}
            </div>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {g.orders.map((o, i) => <Row key={o.id} order={o} first={i === 0} onOpen={() => setSelected(o)} />)}
            </Card>
          </section>
        ))}
      </div>

      {selected && <DetailSheet order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
