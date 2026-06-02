import React, { useState, useMemo } from 'react'
import { OrderStatusBadge } from '../components/StatusBadge'
import { OrderDetailPanel } from '../components/OrderDetailPanel'
import { useAdminStore } from '../store/AdminContext'
import { fmt, fmtDate, relativeTime } from '@shared/utils/format'
import type { User } from '@shared/types'

export function CustomersScreen() {
  const { state } = useAdminStore()
  const [search,         setSearch]         = useState('')
  const [selectedUser,   setSelectedUser]   = useState<User | null>(null)
  const [selectedOrder,  setSelectedOrder]  = useState<string | null>(null)

  // Exclude any user whose email matches a driver's email. A driver can have a
  // customer-role profile row (signed up as a customer first, then later became
  // a driver — same Supabase user, same email). Email-match works without
  // requiring user_id on the Driver type.
  const driverEmails = useMemo(
    () => new Set(state.drivers.map(d => d.email.toLowerCase()).filter(Boolean)),
    [state.drivers],
  )
  const customerOnly = useMemo(
    () => state.users.filter(u => !driverEmails.has(u.email.toLowerCase())),
    [state.users, driverEmails],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customerOnly
    return customerOnly.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    )
  }, [customerOnly, search])

  const userOrders = useMemo(() =>
    selectedUser
      ? state.orders.filter(o => o.customerId === selectedUser.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [],
    [selectedUser, state.orders]
  )

  const totalSpend = (userId: string) =>
    state.receipts.filter(r => r.customerId === userId).reduce((s, r) => s + r.total, 0)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left: customer list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Customers</div>
            <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>{state.users.length} registered users</div>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-muted)' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, phone…"
              style={{
                padding: '8px 12px 8px 30px', border: '1.5px solid var(--a-border)',
                borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', width: 240,
              }}
            />
          </div>
        </div>

        <table className="a-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Total Spend</th>
              <th>City</th>
              <th>Member Since</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr
                key={u.id}
                className="clickable"
                onClick={() => setSelectedUser(u)}
                style={{ background: selectedUser?.id === u.id ? '#f0f4ff' : undefined }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#c94a1b,#e07350)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>
                      {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>{u.email}</td>
                <td style={{ fontSize: 12 }}>{u.phone}</td>
                <td style={{ fontSize: 13, fontWeight: 500 }}>{u.orderIds.length}</td>
                <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{fmt(totalSpend(u.id))}</td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)', textTransform: 'capitalize' }}>{u.cityId}</td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right: customer detail */}
      {selectedUser && (
        <div style={{
          width: 360, flexShrink: 0,
          background: 'var(--a-surface)', border: '1px solid var(--a-border)',
          borderRadius: 10, boxShadow: 'var(--a-shadow)',
          position: 'sticky', top: 0,
        }}>
          {/* Header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--a-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--a-ink)' }}>{selectedUser.name}</div>
                <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 2 }}>{selectedUser.email}</div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ border: 'none', background: 'transparent', color: 'var(--a-muted)', fontSize: 18, cursor: 'pointer' }}
              >×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              {[
                { k: 'Phone',     v: selectedUser.phone },
                { k: 'City',      v: selectedUser.cityId },
                { k: 'Orders',    v: String(userOrders.length) },
                { k: 'Total Spend', v: fmt(totalSpend(selectedUser.id)) },
              ].map(r => (
                <div key={r.k} style={{ background: 'var(--a-bg)', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--a-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders list */}
          <div style={{ padding: '12px 16px', maxHeight: 460, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 10 }}>
              Order History
            </div>
            {userOrders.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--a-muted)', textAlign: 'center', padding: '16px 0' }}>No orders</div>
            ) : userOrders.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedOrder(o.id)}
                style={{
                  width: '100%', padding: '10px 12px', marginBottom: 8,
                  border: '1.5px solid var(--a-border)', borderRadius: 8,
                  background: '#fff', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, fontWeight: 600 }}>{o.id}</span>
                  <OrderStatusBadge status={o.status} size="sm" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>
                  {o.dropoff.address.split(',')[0]}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>{relativeTime(o.createdAt)}</span>
                  <span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, fontWeight: 500 }}>{fmt(o.priceBreakdown.total)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailPanel orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}
