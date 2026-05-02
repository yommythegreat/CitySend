import React from 'react'
import { OrderStatusBadge } from '../components/StatusBadge'
import { useAdminStore } from '../store/AdminContext'
import { fmt, relativeTime } from '@shared/utils/format'
import type { AdminScreen } from '../App'

interface Props { go: (s: AdminScreen) => void }

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'var(--a-sidebar)' : 'var(--a-surface)',
      border: accent ? 'none' : '1px solid var(--a-border)',
      borderRadius: 10, padding: '18px 20px',
      boxShadow: 'var(--a-shadow)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: accent ? 'rgba(255,255,255,0.55)' : 'var(--a-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: accent ? '#fff' : 'var(--a-ink)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, marginTop: 6, color: accent ? 'rgba(255,255,255,0.5)' : 'var(--a-muted)' }}>{sub}</div>}
    </div>
  )
}

export function DashboardScreen({ go }: Props) {
  const { state } = useAdminStore()
  const { orders, drivers, receipts } = state

  const totalOrders   = orders.length
  const activeOrders  = orders.filter(o => ['assigned','picked_up','in_transit'].includes(o.status)).length
  const newOrders     = orders.filter(o => o.status === 'new').length
  const deliveredToday = orders.filter(o => {
    if (o.status !== 'delivered') return false
    const d = new Date(o.updatedAt)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }).length
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
  const todayRevenue    = receipts.filter(r => {
    const d = new Date(r.createdAt), t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }).reduce((sum, r) => sum + r.total, 0)
  const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0)

  const driversAvailable = drivers.filter(d => d.status === 'available').length
  const driversBusy      = drivers.filter(d => d.status === 'busy').length

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Dashboard</div>
        <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
          CitySend operations overview
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Orders"      value={totalOrders}        sub={`${cancelledOrders} cancelled`} />
        <StatCard label="Active"            value={activeOrders}       sub={`${newOrders} unassigned`} accent />
        <StatCard label="Delivered Today"   value={deliveredToday}     sub="completed orders" />
        <StatCard label="Revenue Today"     value={fmt(todayRevenue)}  sub={`${fmt(totalRevenue)} all time`} />
      </div>

      {/* Two-column: recent orders + driver summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Recent orders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--a-ink)' }}>Recent Orders</span>
            <button
              onClick={() => go('orders')}
              style={{ fontSize: 12, color: 'var(--a-accent)', fontWeight: 500, border: 'none', background: 'none' }}
            >View all →</button>
          </div>
          <table className="a-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Status</th>
                <th>Total</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} onClick={() => go('orders')} className="clickable">
                  <td><span style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{o.id}</span></td>
                  <td style={{ fontWeight: 500 }}>{o.customerName}</td>
                  <td style={{ fontSize: 12, color: 'var(--a-muted)', maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.pickup.address.split(',')[0]} → {o.dropoff.address.split(',')[0]}
                    </div>
                  </td>
                  <td><OrderStatusBadge status={o.status} size="sm" /></td>
                  <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{fmt(o.priceBreakdown.total)}</td>
                  <td style={{ fontSize: 12, color: 'var(--a-muted)', whiteSpace: 'nowrap' }}>
                    {relativeTime(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Driver status + quick stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'var(--a-surface)', border: '1px solid var(--a-border)',
            borderRadius: 10, padding: '16px', boxShadow: 'var(--a-shadow)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Driver Status</div>
            {[
              { label: 'Available', count: driversAvailable,                            color: 'var(--a-ok)'   },
              { label: 'Busy',      count: driversBusy,                                 color: 'var(--a-warn)' },
              { label: 'Offline',   count: drivers.filter(d=>d.status==='offline').length, color: 'var(--a-muted)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--a-ink)' }}>{row.count}</span>
              </div>
            ))}
            <button
              onClick={() => go('drivers')}
              style={{
                width: '100%', marginTop: 4, padding: '7px', border: '1.5px solid var(--a-border)',
                borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)',
              }}
            >Manage drivers →</button>
          </div>

          {/* Order breakdown */}
          <div style={{
            background: 'var(--a-surface)', border: '1px solid var(--a-border)',
            borderRadius: 10, padding: '16px', boxShadow: 'var(--a-shadow)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Order Breakdown</div>
            {[
              { label: 'New',         count: newOrders,                                          color: 'var(--a-info)'   },
              { label: 'In Progress', count: activeOrders,                                       color: 'var(--a-warn)'   },
              { label: 'Delivered',   count: orders.filter(o=>o.status==='delivered').length,    color: 'var(--a-ok)'     },
              { label: 'Cancelled',   count: cancelledOrders,                                    color: 'var(--a-muted)'  },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{row.label}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--a-ink)' }}>{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
