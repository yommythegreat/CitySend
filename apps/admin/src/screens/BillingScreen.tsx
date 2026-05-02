import React, { useState, useMemo } from 'react'
import { useAdminStore } from '../store/AdminContext'
import { fmt, fmtDateTime } from '@shared/utils/format'
import { OrderDetailPanel } from '../components/OrderDetailPanel'

const BRAND_ICON: Record<string, string> = { visa: '💳', mastercard: '💳', amex: '💳' }

export function BillingScreen() {
  const { state } = useAdminStore()
  const [search,        setSearch]        = useState('')
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return state.receipts
    return state.receipts.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.last4.includes(q)
    )
  }, [state.receipts, search])

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalRevenue = state.receipts.reduce((s, r) => s + r.total, 0)
  const totalTax     = state.receipts.reduce((s, r) => s + r.tax, 0)
  const totalTips    = state.receipts.reduce((s, r) => s + r.tip, 0)
  const avgOrder     = state.receipts.length > 0 ? totalRevenue / state.receipts.length : 0

  const todayReceipts = state.receipts.filter(r => {
    const d = new Date(r.createdAt), t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  })
  const todayRevenue = todayReceipts.reduce((s, r) => s + r.total, 0)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Billing</div>
        <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
          {state.receipts.length} receipts — view only, no financial actions
        </div>
      </div>

      {/* Revenue summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue',    value: fmt(totalRevenue),  sub: `${state.receipts.length} receipts`, accent: true },
          { label: 'Today\'s Revenue', value: fmt(todayRevenue),  sub: `${todayReceipts.length} orders today` },
          { label: 'Tax Collected',    value: fmt(totalTax),      sub: 'GST + PST + HST + QST' },
          { label: 'Total Tips',       value: fmt(totalTips),     sub: `Avg ${fmt(avgOrder)} per order` },
        ].map(c => (
          <div
            key={c.label}
            style={{
              background: c.accent ? 'var(--a-sidebar)' : 'var(--a-surface)',
              border: c.accent ? 'none' : '1px solid var(--a-border)',
              borderRadius: 10, padding: '18px 20px', boxShadow: 'var(--a-shadow)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: c.accent ? 'rgba(255,255,255,0.5)' : 'var(--a-muted)', marginBottom: 8 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, color: c.accent ? '#fff' : 'var(--a-ink)', lineHeight: 1 }}>
              {c.value}
            </div>
            {c.sub && <div style={{ fontSize: 12, marginTop: 6, color: c.accent ? 'rgba(255,255,255,0.45)' : 'var(--a-muted)' }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Search + table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--a-ink)' }}>
          Receipts {search ? `(${filtered.length} of ${state.receipts.length})` : `(${state.receipts.length})`}
        </span>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-muted)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Receipt ID, order, customer…"
            style={{
              padding: '8px 12px 8px 30px', border: '1.5px solid var(--a-border)',
              borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', width: 260,
            }}
          />
        </div>
      </div>

      <table className="a-table">
        <thead>
          <tr>
            <th>Receipt ID</th>
            <th>Order</th>
            <th>Customer</th>
            <th>Subtotal</th>
            <th>Tax</th>
            <th>Tip</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--a-muted)' }}>
                No receipts found.
              </td>
            </tr>
          ) : sorted.map(r => (
            <tr key={r.id}>
              <td>
                <span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, fontWeight: 600 }}>{r.id}</span>
              </td>
              <td>
                <button
                  onClick={() => setSelectedOrder(r.orderId)}
                  style={{
                    fontFamily: 'var(--a-mono)', fontSize: 11, fontWeight: 500,
                    color: 'var(--a-info)', border: 'none', background: 'none', cursor: 'pointer',
                    padding: 0,
                  }}
                >{r.orderId}</button>
              </td>
              <td style={{ fontSize: 13, fontWeight: 500 }}>{r.customerName}</td>
              <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{fmt(r.amount)}</td>
              <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: 'var(--a-muted)' }}>{fmt(r.tax)}</td>
              <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: 'var(--a-muted)' }}>
                {r.tip > 0 ? fmt(r.tip) : '—'}
              </td>
              <td style={{ fontFamily: 'var(--a-mono)', fontSize: 13, fontWeight: 700, color: 'var(--a-ink)' }}>
                {fmt(r.total)}
              </td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>
                {BRAND_ICON[r.brand]} {r.brand.toUpperCase()} ···· {r.last4}
              </td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)', whiteSpace: 'nowrap' }}>
                {fmtDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <OrderDetailPanel orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}
