import React, { useState, useMemo } from 'react'
import { OrderStatusBadge } from '../components/StatusBadge'
import { OrderDetailPanel } from '../components/OrderDetailPanel'
import { Modal } from '../components/Modal'
import { useAdminStore } from '../store/AdminContext'
import { fmt, relativeTime, parcelSizeLabel } from '@shared/utils/format'
import { computeOrderPrice } from '@shared/utils/serviceAvailability'
import type { Order, OrderStatus, CityId } from '@shared/types'
import { ORDER_STATUS_LABELS } from '@shared/types'

const ALL_STATUSES: (OrderStatus | 'all')[] = ['all', 'new', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled']

const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000
const STUCK_ACTIVE: readonly OrderStatus[] = ['assigned', 'picked_up', 'in_transit']
const isStuck = (o: Order) =>
  STUCK_ACTIVE.includes(o.status) &&
  Date.now() - new Date(o.updatedAt).getTime() > STUCK_THRESHOLD_MS

// ── Create Order Modal ────────────────────────────────────────────────────────

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAdminStore()

  const [customerName, setCustomerName] = useState('')
  const [customerId,   setCustomerId]   = useState('')
  const [cityId,       setCityId]       = useState<CityId>('winnipeg')
  const [pickupAddr,   setPickupAddr]   = useState('')
  const [pickupName,   setPickupName]   = useState('')
  const [pickupPhone,  setPickupPhone]  = useState('')
  const [dropoffAddr,  setDropoffAddr]  = useState('')
  const [dropoffName,  setDropoffName]  = useState('')
  const [dropoffPhone, setDropoffPhone] = useState('')
  const [parcelSize,   setParcelSize]   = useState<'s' | 'm' | 'l'>('m')
  const [parcelDesc,   setParcelDesc]   = useState('')
  const [fragile,      setFragile]      = useState(false)
  const [distKm,       setDistKm]       = useState(5)
  const [tip,          setTip]          = useState(0)
  const [saving,       setSaving]       = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--a-border)',
    borderRadius: 8, fontSize: 13,
    fontFamily: 'var(--a-font)', outline: 'none',
    background: '#fff', color: 'var(--a-ink)',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--a-ink2)', marginBottom: 5,
  }

  // Compute price from live city config (same formula as customer app)
  const cityConfig = state.cityConfigs.find(c => c.cityId === cityId)
  const breakdown = useMemo(() => {
    if (!cityConfig) return null
    return computeOrderPrice({ cityConfig, distKm, parcelSize, fragile, tip })
  }, [cityConfig, distKm, parcelSize, fragile, tip])

  const handleCreate = () => {
    if (!customerName.trim() || !pickupAddr.trim() || !dropoffAddr.trim() || !breakdown) return
    setSaving(true)

    const now   = new Date().toISOString()
    const newId = `CS-ADM-${Date.now().toString().slice(-5)}`

    const order: Order = {
      id: newId,
      customerId:    customerId.trim() || `guest-${Date.now()}`,
      customerName:  customerName.trim(),
      pickup: {
        name:    pickupName.trim()  || customerName.trim(),
        phone:   pickupPhone.trim(),
        address: pickupAddr.trim(),
      },
      dropoff: {
        name:    dropoffName.trim()  || 'Recipient',
        phone:   dropoffPhone.trim(),
        address: dropoffAddr.trim(),
      },
      parcel: { size: parcelSize, desc: parcelDesc.trim() || 'Package', fragile },
      status: 'new',
      priceBreakdown: breakdown,
      cityId,
      distanceKm: distKm,
      createdAt: now,
      updatedAt: now,
      notes: [{
        id: `note-admin-${Date.now()}`,
        text: 'Order manually created by admin.',
        authorName: 'Admin',
        createdAt: now,
      }],
    }

    setTimeout(() => {
      dispatch({ type: 'CREATE_ORDER', order })
      setSaving(false)
      onClose()
    }, 600)
  }

  const cityOptions: CityId[] = ['winnipeg', 'toronto', 'calgary', 'vancouver', 'edmonton', 'ottawa', 'montreal']
  const canCreate = customerName.trim() && pickupAddr.trim() && dropoffAddr.trim() && !!breakdown

  return (
    <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Customer name *</label>
          <input style={inputStyle} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label style={labelStyle}>Customer ID (optional)</label>
          <input style={inputStyle} value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="u1, u2…" />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <select style={inputStyle} value={cityId} onChange={e => setCityId(e.target.value as CityId)}>
            {cityOptions.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--a-border)', paddingTop: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Pickup</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address *</label>
            <input style={inputStyle} value={pickupAddr} onChange={e => setPickupAddr(e.target.value)} placeholder="123 Main St, Winnipeg" />
          </div>
          <div>
            <label style={labelStyle}>Contact name</label>
            <input style={inputStyle} value={pickupName} onChange={e => setPickupName(e.target.value)} placeholder="Sender name" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={pickupPhone} onChange={e => setPickupPhone(e.target.value)} placeholder="204 555 0100" />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--a-border)', paddingTop: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Drop-off</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address *</label>
            <input style={inputStyle} value={dropoffAddr} onChange={e => setDropoffAddr(e.target.value)} placeholder="456 Portage Ave, Winnipeg" />
          </div>
          <div>
            <label style={labelStyle}>Recipient name</label>
            <input style={inputStyle} value={dropoffName} onChange={e => setDropoffName(e.target.value)} placeholder="Recipient name" />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={dropoffPhone} onChange={e => setDropoffPhone(e.target.value)} placeholder="204 555 0200" />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--a-border)', paddingTop: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Parcel</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Size</label>
            <select style={inputStyle} value={parcelSize} onChange={e => setParcelSize(e.target.value as 's' | 'm' | 'l')}>
              <option value="s">Small (envelope, small box)</option>
              <option value="m">Medium (standard box)</option>
              <option value="l">Large (large/heavy box)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Est. distance (km)</label>
            <input style={inputStyle} type="number" min={1} max={100} value={distKm} onChange={e => setDistKm(Number(e.target.value))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={parcelDesc} onChange={e => setParcelDesc(e.target.value)} placeholder="E.g. Documents, gift, clothing" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="fragile-chk" checked={fragile} onChange={e => setFragile(e.target.checked)} />
            <label htmlFor="fragile-chk" style={{ fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>⚠️ Fragile</label>
          </div>
          <div>
            <label style={labelStyle}>Tip ($)</label>
            <select style={inputStyle} value={tip} onChange={e => setTip(Number(e.target.value))}>
              {[0, 2, 3, 5].map(t => <option key={t} value={t}>{t === 0 ? 'No tip' : `$${t}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Price preview */}
      <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
        {!breakdown ? (
          <div style={{ color: 'var(--a-muted)', textAlign: 'center' }}>Loading pricing…</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: 'var(--a-muted)' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'var(--a-mono)' }}>{fmt(breakdown.subtotalPreTax)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: 'var(--a-muted)' }}>
              <span>Tax</span><span style={{ fontFamily: 'var(--a-mono)' }}>{fmt(breakdown.totalTax)}</span>
            </div>
            {tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: 'var(--a-muted)' }}>
                <span>Tip</span><span style={{ fontFamily: 'var(--a-mono)' }}>{fmt(tip)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--a-border)', fontWeight: 700, color: 'var(--a-ink)' }}>
              <span>Total</span><span style={{ fontFamily: 'var(--a-mono)' }}>{fmt(breakdown.total)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ padding: '9px 18px', border: '1.5px solid var(--a-border)', borderRadius: 8, background: '#fff', color: 'var(--a-ink2)', fontSize: 13, cursor: 'pointer' }}
        >Cancel</button>
        <button
          onClick={handleCreate}
          disabled={!canCreate || saving}
          style={{
            padding: '9px 22px', border: 'none', borderRadius: 8,
            background: !canCreate || saving ? 'var(--a-border)' : 'var(--a-sidebar)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: !canCreate || saving ? 'default' : 'pointer',
          }}
        >{saving ? 'Creating…' : 'Create order'}</button>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

type FilterValue = OrderStatus | 'all' | 'stuck'

interface OrdersScreenProps {
  initialFilter?: FilterValue
}

export function OrdersScreen({ initialFilter = 'all' }: OrdersScreenProps) {
  const { state } = useAdminStore()
  const [filter,     setFilter]     = useState<FilterValue>(initialFilter)
  const [search,     setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    let list = state.orders
    if (filter === 'stuck')     list = list.filter(isStuck)
    else if (filter !== 'all')  list = list.filter(o => o.status === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.pickup.address.toLowerCase().includes(q) ||
        o.dropoff.address.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [state.orders, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.orders.length, stuck: state.orders.filter(isStuck).length }
    for (const s of ALL_STATUSES) {
      if (s !== 'all') c[s] = state.orders.filter(o => o.status === s).length
    }
    return c
  }, [state.orders])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Orders</div>
          <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
            {filtered.length} of {state.orders.length} orders
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-muted)', fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, customer, address…"
              style={{
                padding: '8px 12px 8px 32px', border: '1.5px solid var(--a-border)',
                borderRadius: 8, fontSize: 13, outline: 'none',
                background: '#fff', width: 260,
              }}
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 8,
              background: 'var(--a-sidebar)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >+ Create order</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '5px 12px', borderRadius: 999,
              border: filter === s ? 'none' : '1.5px solid var(--a-border)',
              background: filter === s ? 'var(--a-sidebar)' : '#fff',
              color: filter === s ? '#fff' : 'var(--a-ink2)',
              fontSize: 12, fontWeight: filter === s ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'All' : ORDER_STATUS_LABELS[s]}
            <span style={{ marginLeft: 5, fontSize: 10, color: filter === s ? 'rgba(255,255,255,0.6)' : 'var(--a-muted)' }}>
              {counts[s]}
            </span>
          </button>
        ))}
        {/* Stuck tab — only shown when there are stuck orders or it is currently active */}
        {(counts.stuck > 0 || filter === 'stuck') && (
          <button
            onClick={() => setFilter('stuck')}
            style={{
              padding: '5px 12px', borderRadius: 999,
              border: filter === 'stuck' ? 'none' : '1.5px solid #f59e0b',
              background: filter === 'stuck' ? '#d97706' : '#fef3c7',
              color: filter === 'stuck' ? '#fff' : '#92400e',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⚠️ Stuck
            <span style={{ marginLeft: 5, fontSize: 10, color: filter === 'stuck' ? 'rgba(255,255,255,0.7)' : '#b45309' }}>
              {counts.stuck}
            </span>
          </button>
        )}
      </div>

      {/* Table */}
      <table className="a-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Pickup</th>
            <th>Drop-off</th>
            <th>Parcel</th>
            <th>Status</th>
            <th>Driver</th>
            <th>Total</th>
            <th>Time</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--a-muted)' }}>
                No orders match your filter.
              </td>
            </tr>
          ) : filtered.map(o => (
            <tr
              key={o.id}
              className="clickable"
              onClick={() => setSelectedId(o.id)}
              style={{
                opacity: o.status === 'cancelled' ? 0.6 : 1,
                borderLeft: isStuck(o) ? '3px solid #f59e0b' : '3px solid transparent',
              }}
            >
              <td>
                <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: 600 }}>{o.id}</span>
              </td>
              <td style={{ fontWeight: 500, fontSize: 13 }}>{o.customerName}</td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)', maxWidth: 140 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.pickup.address.split(',')[0]}
                </div>
              </td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)', maxWidth: 140 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.dropoff.address.split(',')[0]}
                </div>
              </td>
              <td style={{ fontSize: 12 }}>
                {parcelSizeLabel(o.parcel.size)}{o.parcel.fragile ? ' · ⚠' : ''}
              </td>
              <td><OrderStatusBadge status={o.status} size="sm" /></td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>
                {o.assignedDriverName ?? '—'}
              </td>
              <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>{fmt(o.priceBreakdown.total)}</td>
              <td style={{ fontSize: 12, color: 'var(--a-muted)', whiteSpace: 'nowrap' }}>
                {relativeTime(o.createdAt)}
                {isStuck(o) && (
                  <span style={{ display: 'inline-block', marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700 }}>
                    {Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 3_600_000)}h stuck
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--a-accent)', fontSize: 14 }}>›</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedId && (
        <OrderDetailPanel orderId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {showCreate && (
        <Modal title="Create new delivery order" onClose={() => setShowCreate(false)} width={720}>
          <CreateOrderModal onClose={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  )
}
