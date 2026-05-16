import React, { useState } from 'react'
import { useDriver } from '../store/DriverContext'
import { OrderStatusPill } from '../components/StatusPill'
import type { Order } from '@shared/types'

interface Props {
  onSelectOrder: (orderId: string) => void
}

const SIZE_LABEL: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }

function fmt(n: number) { return `$${n.toFixed(2)}` }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function HistoryCard({ order, onSelect }: { order: Order; onSelect: () => void }) {
  const isCancelled = order.status === 'cancelled'
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--d-surface)',
        border: '1px solid var(--d-border)',
        borderRadius: 'var(--d-radius)', padding: '14px 16px',
        cursor: 'pointer', display: 'block',
        boxShadow: 'var(--d-shadow)',
        opacity: isCancelled ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--d-muted)', marginBottom: 3 }}>
            {order.id}
          </div>
          <OrderStatusPill status={order.status} />
        </div>
        {!isCancelled && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ok)' }}>
              {fmt(order.priceBreakdown.total)}
            </div>
            {order.priceBreakdown.tip > 0 && (
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>+{fmt(order.priceBreakdown.tip)} tip</div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, color: 'var(--d-ink-2)', marginBottom: 2 }}>
        {order.dropoff.address.split(',')[0]}
      </div>
      <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>
        {order.pickup.address.split(',')[0]} → {order.dropoff.address.split(',')[0]}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--d-muted)', background: 'var(--d-bg)', padding: '2px 7px', borderRadius: 5 }}>
            {order.distanceKm} km
          </span>
          <span style={{ fontSize: 11, color: 'var(--d-muted)', background: 'var(--d-bg)', padding: '2px 7px', borderRadius: 5 }}>
            {SIZE_LABEL[order.parcel.size]}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{fmtDate(order.updatedAt)}</div>
      </div>
    </button>
  )
}

export function HistoryScreen({ onSelectOrder }: Props) {
  const { completedOrders } = useDriver()
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all')

  const filtered = filter === 'all' ? completedOrders
    : completedOrders.filter(o => o.status === filter)

  const totalEarned = completedOrders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + o.priceBreakdown.total, 0)

  const totalTips = completedOrders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + o.priceBreakdown.tip, 0)

  const deliveredCount = completedOrders.filter(o => o.status === 'delivered').length
  const cancelledCount = completedOrders.filter(o => o.status === 'cancelled').length

  return (
    <div className="d-scroll">
      {/* Summary */}
      <div style={{ padding: '16px 12px 8px' }}>
        <div className="d-stat-grid">
          <div className="d-stat-tile" style={{ gridColumn: '1 / -1', background: 'var(--d-accent)', borderRadius: 'var(--d-radius)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 500, marginBottom: 4 }}>Total Earned</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{fmt(totalEarned)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>
              incl. {fmt(totalTips)} in tips · {deliveredCount} deliveries
            </div>
          </div>
          <div className="d-stat-tile">
            <div className="d-stat-label">Delivered</div>
            <div className="d-stat-value" style={{ color: 'var(--d-ok)' }}>{deliveredCount}</div>
          </div>
          <div className="d-stat-tile">
            <div className="d-stat-label">Cancelled</div>
            <div className="d-stat-value" style={{ color: 'var(--d-muted)' }}>{cancelledCount}</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: 'var(--d-bg)' }}>
        {(['all', 'delivered', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px',
              border: filter === f ? 'none' : '1px solid var(--d-border)',
              borderRadius: 999,
              background: filter === f ? 'var(--d-ink)' : 'var(--d-surface)',
              color: filter === f ? '#fff' : 'var(--d-muted)',
              fontSize: 13, fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? `All (${completedOrders.length})` :
             f === 'delivered' ? `Delivered (${deliveredCount})` :
             `Cancelled (${cancelledCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div className="d-empty">
            <div className="d-empty-icon">📭</div>
            <div className="d-empty-text">No {filter === 'all' ? '' : filter} orders yet.</div>
          </div>
        ) : filtered.map(o => (
          <HistoryCard key={o.id} order={o} onSelect={() => onSelectOrder(o.id)} />
        ))}
      </div>

      <div style={{ height: 24 }} />
    </div>
  )
}
