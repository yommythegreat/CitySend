import React from 'react'
import { useDriver } from '../store/DriverContext'
import { OrderStatusPill } from '../components/StatusPill'
import type { Order } from '@shared/types'

interface Props {
  onSelectOrder: (orderId: string) => void
  onGoHistory:   () => void
}

const SIZE_LABEL: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ActiveJobCard({ order, onSelect }: { order: Order; onSelect: () => void }) {
  const isUrgent = order.status === 'assigned'

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left', background: 'var(--d-surface)',
        border: `2px solid ${isUrgent ? 'var(--d-accent)' : 'var(--d-border)'}`,
        borderRadius: 'var(--d-radius)', padding: '14px 16px',
        cursor: 'pointer', display: 'block',
        boxShadow: isUrgent ? '0 2px 8px rgba(201,74,27,.15)' : 'var(--d-shadow)',
      }}
    >
      {isUrgent && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--d-accent)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 999, marginBottom: 8, letterSpacing: 0.4,
        }}>NEW JOB</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--d-accent)', marginBottom: 2 }}>
            {order.id}
          </div>
          <OrderStatusPill status={order.status} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{relTime(order.updatedAt)}</div>
      </div>

      {/* Route summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="d-addr-row">
          <div className="d-addr-dot d-addr-dot-green" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--d-ink)' }}>{order.pickup.address.split(',')[0]}</div>
            <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{order.pickup.name}</div>
          </div>
        </div>
        <div style={{ borderLeft: '2px dashed var(--d-border)', height: 10, marginLeft: 4 }} />
        <div className="d-addr-row">
          <div className="d-addr-dot d-addr-dot-orange" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--d-ink)' }}>{order.dropoff.address.split(',')[0]}</div>
            <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{order.dropoff.name}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--d-muted)', background: 'var(--d-bg)', padding: '3px 8px', borderRadius: 6 }}>
          📏 {order.distanceKm} km
        </span>
        <span style={{ fontSize: 11, color: 'var(--d-muted)', background: 'var(--d-bg)', padding: '3px 8px', borderRadius: 6 }}>
          📦 {SIZE_LABEL[order.parcel.size]}
        </span>
        {order.parcel.fragile && (
          <span style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
            ⚠️ Fragile
          </span>
        )}
      </div>
    </button>
  )
}

export function DashboardScreen({ onSelectOrder, onGoHistory }: Props) {
  const { state, activeOrders, completedOrders } = useDriver()
  const { auth } = state

  if (!auth) return null

  const todayDeliveries = completedOrders.filter(o => {
    const d = new Date(o.updatedAt), t = new Date()
    return d.getFullYear() === t.getFullYear() &&
           d.getMonth()    === t.getMonth() &&
           d.getDate()     === t.getDate()
  })

  return (
    <div className="d-scroll">
      {/* Driver header */}
      <div style={{
        background: 'var(--d-accent)', padding: '20px 16px 24px',
        marginBottom: -12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {auth.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>Good {greeting()}</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{auth.name}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            background: 'rgba(255,255,255,.15)', borderRadius: 999,
            padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#fff',
          }}>⭐ {auth.rating}</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
          🚗 {auth.vehicle}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div className="d-stat-grid">
          <div className="d-stat-tile">
            <div className="d-stat-label">Active Jobs</div>
            <div className="d-stat-value">{activeOrders.length}</div>
            <div className="d-stat-sub">right now</div>
          </div>
          <div className="d-stat-tile">
            <div className="d-stat-label">Today</div>
            <div className="d-stat-value">{todayDeliveries.length}</div>
            <div className="d-stat-sub">completed</div>
          </div>
          <div className="d-stat-tile">
            <div className="d-stat-label">Total Deliveries</div>
            <div className="d-stat-value">{auth.completedOrders}</div>
            <div className="d-stat-sub">all time</div>
          </div>
          <div className="d-stat-tile">
            <div className="d-stat-label">Rating</div>
            <div className="d-stat-value" style={{ color: '#d97706' }}>⭐ {auth.rating}</div>
            <div className="d-stat-sub">driver score</div>
          </div>
        </div>
      </div>

      {/* Active jobs */}
      <div style={{ padding: '8px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-ink)' }}>
            Active Jobs
            {activeOrders.length > 0 && (
              <span style={{
                marginLeft: 8, background: 'var(--d-accent)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
              }}>{activeOrders.length}</span>
            )}
          </div>
        </div>

        {activeOrders.length === 0 ? (
          <div className="d-card" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--d-ink)', marginBottom: 4 }}>All clear!</div>
            <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>No active jobs right now.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeOrders.map(o => (
              <ActiveJobCard key={o.id} order={o} onSelect={() => onSelectOrder(o.id)} />
            ))}
          </div>
        )}
      </div>

      {/* History link */}
      {completedOrders.length > 0 && (
        <div style={{ padding: '12px 16px 8px' }}>
          <button
            onClick={onGoHistory}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--d-surface)', border: '1px solid var(--d-border)',
              borderRadius: 'var(--d-radius)', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)', textAlign: 'left' }}>Delivery History</div>
              <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 2 }}>{completedOrders.length} completed deliveries</div>
            </div>
            <span style={{ color: 'var(--d-muted)', fontSize: 18 }}>›</span>
          </button>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
