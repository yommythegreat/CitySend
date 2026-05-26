import React, { useState, useMemo, useRef, useEffect } from 'react'
import { DriverStatusBadge, OrderStatusBadge } from '../components/StatusBadge'
import { OrderDetailPanel } from '../components/OrderDetailPanel'
import { Modal } from '../components/Modal'
import { useAdminStore } from '../store/AdminContext'
import { fmt } from '@shared/utils/format'
import type { Driver, DriverStatus, Order } from '@shared/types'
import { DRIVER_STATUS_LABELS } from '@shared/types'

const STATUS_FILTERS: (DriverStatus | 'all')[] = ['all', 'available', 'busy', 'offline', 'suspended']

// ── Shared input helpers ──────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid var(--a-border)', borderRadius: 8, fontSize: 13,
  fontFamily: 'var(--a-font)', outline: 'none',
  background: '#fff', color: 'var(--a-ink)', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 5,
}

// ── Driver form ───────────────────────────────────────────────────────────────

function DriverForm({
  initial, isEdit, onSave, onCancel,
}: {
  initial?: Partial<Driver>
  isEdit?: boolean
  onSave: (d: Partial<Driver>) => void
  onCancel: () => void
}) {
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [email,   setEmail]   = useState(initial?.email   ?? '')
  const [phone,   setPhone]   = useState(initial?.phone   ?? '')
  const [vehicle, setVehicle] = useState(initial?.vehicle ?? '')
  const [status,  setStatus]  = useState<DriverStatus>(initial?.status ?? 'offline')

  const save = () => {
    if (!name.trim() || !email.trim()) return
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), vehicle: vehicle.trim(), status, initials })
  }

  const valid = name.trim() && email.trim()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Full name *</label>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <label style={lbl}>Email *</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@citysend.ca" />
        </div>
        <div>
          <label style={lbl}>Phone</label>
          <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="204 555 0100" />
        </div>
        <div>
          <label style={lbl}>Vehicle</label>
          <input style={inp} value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="2022 Toyota Corolla — Blue" />
        </div>
      </div>
      <div>
        <label style={lbl}>Initial status</label>
        <select style={inp} value={status} onChange={e => setStatus(e.target.value as DriverStatus)}>
          {(['available', 'offline', 'suspended'] as DriverStatus[]).map(s => (
            <option key={s} value={s}>{DRIVER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={onCancel} style={{ padding: '8px 18px', border: '1.5px solid var(--a-border)', borderRadius: 8, background: '#fff', color: 'var(--a-ink2)', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
        <button
          onClick={save} disabled={!valid}
          style={{ padding: '8px 22px', border: 'none', borderRadius: 8, background: valid ? 'var(--a-sidebar)' : 'var(--a-border)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: valid ? 'pointer' : 'default' }}
        >
          {isEdit ? 'Save changes' : 'Add driver'}
        </button>
      </div>
    </div>
  )
}

// ── Assign Order modal ────────────────────────────────────────────────────────

function AssignOrderModal({
  driver, orders, onAssign, onClose,
}: {
  driver: Driver
  orders: Order[]
  onAssign: (orderId: string) => void
  onClose: () => void
}) {
  const unassigned = orders.filter(o => o.status === 'new')
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 16 }}>
        Assign an unassigned order to <strong>{driver.name}</strong>.
        Their status will update to <strong>Busy</strong> automatically.
      </p>
      {unassigned.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
          No unassigned orders available right now.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
          {unassigned.map(o => (
            <button
              key={o.id}
              onClick={() => onAssign(o.id)}
              style={{
                padding: '12px 14px', border: '1.5px solid var(--a-border)', borderRadius: 10,
                background: '#fff', textAlign: 'left', cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--a-accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--a-bg)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--a-border)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: 700, color: 'var(--a-ink)' }}>{o.id}</span>
                <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: 'var(--a-ok)', fontWeight: 600 }}>{fmt(o.priceBreakdown.total)}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink)', marginBottom: 3 }}>{o.customerName}</div>
              <div style={{ fontSize: 12, color: 'var(--a-muted)' }}>
                {o.pickup.address.split(',')[0]} → {o.dropoff.address.split(',')[0]}
              </div>
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button onClick={onClose} style={{ padding: '8px 18px', border: '1.5px solid var(--a-border)', borderRadius: 8, background: '#fff', color: 'var(--a-ink2)', fontSize: 13, cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, body, danger = false, confirmLabel, onConfirm, onCancel,
}: {
  title: string
  body: React.ReactNode
  danger?: boolean
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--a-ink)', lineHeight: 1.55, marginBottom: 24 }}>{body}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '8px 18px', border: '1.5px solid var(--a-border)', borderRadius: 8, background: '#fff', color: 'var(--a-ink2)', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{ padding: '8px 22px', border: 'none', borderRadius: 8, background: danger ? 'var(--a-err)' : 'var(--a-sidebar)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

// ── Expandable driver card ────────────────────────────────────────────────────

function DriverCard({
  driver, isExpanded, onToggle,
  onEdit, onActivate, onAssignOrder, onRemoveFromOrder, onSuspend, onReinstate, onViewOrder,
  currentOrder,
}: {
  driver: Driver
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onActivate: () => void
  onAssignOrder: () => void
  onRemoveFromOrder: () => void
  onSuspend: () => void
  onReinstate: () => void
  onViewOrder: (id: string) => void
  currentOrder?: Order
}) {
  const isSuspended = driver.status === 'suspended'
  const isBusy      = driver.status === 'busy'
  const isOffline   = driver.status === 'offline'

  // Stars renderer
  const stars = (r: number) => {
    const full = Math.floor(r)
    return '★'.repeat(full) + (r - full >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(r))
  }

  return (
    <div
      style={{
        background: 'var(--a-surface)',
        border: `1.5px solid ${isExpanded ? 'var(--a-accent)' : isSuspended ? 'var(--a-err-bg)' : 'var(--a-border)'}`,
        borderRadius: 12,
        boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : 'var(--a-shadow)',
        transition: 'border-color .2s, box-shadow .2s',
        overflow: 'hidden',
      }}
    >
      {/* ── Collapsed header (always visible) ─────────────────────────────── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', border: 'none', background: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: isSuspended
            ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
            : isExpanded
            ? 'linear-gradient(135deg,var(--a-accent),#e06840)'
            : 'linear-gradient(135deg,#2b3548,#5b657a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff',
          transition: 'background .2s',
        }}>
          {driver.initials}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--a-ink)', lineHeight: 1.2 }}>
            {driver.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#f59e0b', letterSpacing: 0.5 }} title={`Rating: ${driver.rating}`}>
              {'★'.repeat(Math.round(driver.rating))}{'☆'.repeat(5 - Math.round(driver.rating))}
            </span>
            <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>{driver.rating}</span>
            <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>{driver.completedOrders} deliveries</span>
            {(driver.offersReceived ?? 0) > 0 && (() => {
              const rate = Math.round(((driver.offersReceived! - (driver.offersDeclined ?? 0)) / driver.offersReceived!) * 100)
              return (
                <>
                  <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>·</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                    background: rate >= 80 ? 'var(--a-ok-bg)' : rate >= 50 ? 'var(--a-warn-bg)' : 'var(--a-err-bg)',
                    color: rate >= 80 ? 'var(--a-ok)' : rate >= 50 ? 'var(--a-warn)' : 'var(--a-err)',
                  }}>
                    {rate}% acceptance
                  </span>
                </>
              )
            })()}
            {isBusy && currentOrder && (
              <>
                <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>·</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                  background: 'var(--a-warn-bg)', color: 'var(--a-warn)',
                }}>
                  On delivery · {currentOrder.id}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status badge + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <DriverStatusBadge status={driver.status} size="sm" />
          <span style={{
            fontSize: 12, color: 'var(--a-muted)',
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform .25s ease',
            display: 'inline-block',
          }}>▼</span>
        </div>
      </button>

      {/* ── Expanded detail section ────────────────────────────────────────── */}
      <div style={{
        maxHeight: isExpanded ? '600px' : '0',
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.28s ease, opacity 0.2s ease',
      }}>
        <div style={{
          borderTop: '1px solid var(--a-border)',
          padding: '16px',
        }}>
          {/* Contact + vehicle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Phone</div>
              <div style={{ fontSize: 13, color: 'var(--a-ink)' }}>📞 {driver.phone || '—'}</div>
            </div>
            <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Email</div>
              <div style={{ fontSize: 12, color: 'var(--a-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ✉️ {driver.email}
              </div>
            </div>
            <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Vehicle</div>
              <div style={{ fontSize: 13, color: 'var(--a-ink)' }}>🚗 {driver.vehicle || 'Not set'}</div>
            </div>
          </div>

          {/* Current order (if busy) */}
          {isBusy && currentOrder && (
            <div style={{
              border: '1.5px solid var(--a-warn-bg)', borderRadius: 10,
              padding: '12px 14px', marginBottom: 14, background: 'var(--a-warn-bg)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: 700, color: 'var(--a-ink)' }}>
                    {currentOrder.id}
                  </span>
                  <OrderStatusBadge status={currentOrder.status} size="sm" />
                </div>
                <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: 'var(--a-ok)', fontWeight: 600 }}>
                  {fmt(currentOrder.priceBreakdown.total)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--a-ink)', marginBottom: 4 }}>
                <strong>Customer:</strong> {currentOrder.customerName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--a-ok)', flexShrink: 0 }} />
                {currentOrder.pickup.address.split(',')[0]}
                <span>→</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--a-accent)', flexShrink: 0 }} />
                {currentOrder.dropoff.address.split(',')[0]}
              </div>
              <button
                onClick={() => onViewOrder(currentOrder.id)}
                style={{ marginTop: 10, fontSize: 12, color: 'var(--a-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--a-font)' }}
              >
                View order details →
              </button>
            </div>
          )}

          {/* Suspended notice */}
          {isSuspended && (
            <div style={{
              background: 'var(--a-err-bg)', border: '1px solid rgba(185,28,28,0.15)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 14,
              fontSize: 13, color: 'var(--a-err)',
            }}>
              ⛔ This driver is suspended and cannot accept deliveries.
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Activate — offline drivers only (self-signup approval) */}
            {isOffline && (
              <button
                onClick={onActivate}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  background: 'var(--a-ok-bg)', color: 'var(--a-ok)',
                  fontSize: 13, cursor: 'pointer', fontWeight: 700,
                }}
              >
                🟢 Activate driver
              </button>
            )}

            {/* Edit — always available */}
            <button
              onClick={onEdit}
              style={{
                padding: '7px 16px', border: '1.5px solid var(--a-border)', borderRadius: 8,
                background: '#fff', color: 'var(--a-ink2)', fontSize: 13, cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ✏️ Edit profile
            </button>

            {/* Assign Order — only if available */}
            {driver.status === 'available' && (
              <button
                onClick={onAssignOrder}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  background: 'var(--a-info-bg)', color: 'var(--a-info)', fontSize: 13, cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                📦 Assign order
              </button>
            )}

            {/* Remove from Order — only if busy */}
            {isBusy && (
              <button
                onClick={onRemoveFromOrder}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  background: 'var(--a-warn-bg)', color: 'var(--a-warn)', fontSize: 13, cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔓 Remove from order
              </button>
            )}

            {/* Suspend / Reinstate */}
            {isSuspended ? (
              <button
                onClick={onReinstate}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  background: 'var(--a-ok-bg)', color: 'var(--a-ok)', fontSize: 13, cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✅ Reinstate
              </button>
            ) : (
              <button
                onClick={onSuspend}
                disabled={isBusy}
                title={isBusy ? 'Complete or remove active delivery first' : 'Suspend driver'}
                style={{
                  padding: '7px 16px', border: 'none', borderRadius: 8,
                  background: isBusy ? 'var(--a-bg)' : 'var(--a-err-bg)',
                  color: isBusy ? 'var(--a-muted)' : 'var(--a-err)',
                  fontSize: 13, cursor: isBusy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                🚫 Suspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ drivers }: { drivers: Driver[] }) {
  const counts = {
    available: drivers.filter(d => d.status === 'available').length,
    busy:      drivers.filter(d => d.status === 'busy').length,
    offline:   drivers.filter(d => d.status === 'offline').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
  }
  const items = [
    { label: 'Available', count: counts.available, color: 'var(--a-ok)'  },
    { label: 'Busy',      count: counts.busy,      color: 'var(--a-warn)' },
    { label: 'Offline',   count: counts.offline,    color: 'var(--a-muted)' },
    ...(counts.suspended > 0 ? [{ label: 'Suspended', count: counts.suspended, color: 'var(--a-err)' }] : []),
  ]
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      {items.map(i => (
        <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: i.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--a-muted)' }}>
            <strong style={{ color: 'var(--a-ink)', fontVariantNumeric: 'tabular-nums' }}>{i.count}</strong> {i.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DriversScreen() {
  const { state, dispatch } = useAdminStore()

  const [filter,       setFilter]       = useState<DriverStatus | 'all'>('all')
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [viewOrderId,  setViewOrderId]  = useState<string | null>(null)

  const pendingCount = useMemo(
    () => state.drivers.filter(d => d.status === 'offline').length,
    [state.drivers],
  )
  // Modals
  const [showAdd,          setShowAdd]          = useState(false)
  const [editDriver,       setEditDriver]        = useState<Driver | null>(null)
  const [assignDriver,     setAssignDriver]      = useState<Driver | null>(null)
  const [confirmSuspend,   setConfirmSuspend]    = useState<Driver | null>(null)
  const [confirmRemove,    setConfirmRemove]     = useState<Driver | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return state.drivers
    return state.drivers.filter(d => d.status === filter)
  }, [state.drivers, filter])

  // ── Accordion toggle — only one open at a time ──────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAdd = (data: Partial<Driver>) => {
    dispatch({
      type: 'ADD_DRIVER',
      driver: {
        id: `d_${Date.now()}`,
        name: data.name ?? 'New Driver',
        initials: data.initials ?? 'ND',
        email: data.email ?? '',
        phone: data.phone ?? '',
        vehicle: data.vehicle ?? '',
        status: data.status ?? 'offline',
        rating: 5.0,
        completedOrders: 0,
        joinedAt: new Date().toISOString(),
      },
    })
    setShowAdd(false)
  }

  const handleEdit = (data: Partial<Driver>) => {
    if (!editDriver) return
    dispatch({ type: 'UPDATE_DRIVER', driverId: editDriver.id, patch: data })
    setEditDriver(null)
  }

  const handleAssignOrder = (orderId: string) => {
    if (!assignDriver) return
    dispatch({ type: 'ASSIGN_DRIVER', orderId, driverId: assignDriver.id })
    setAssignDriver(null)
  }

  const handleSuspend = () => {
    if (!confirmSuspend) return
    dispatch({ type: 'UPDATE_DRIVER', driverId: confirmSuspend.id, patch: { status: 'suspended', currentOrderId: undefined } })
    setConfirmSuspend(null)
    // Collapse the card
    setExpandedId(null)
  }

  const handleRemoveFromOrder = () => {
    if (!confirmRemove) return
    dispatch({
      type: 'UNASSIGN_DRIVER',
      orderId:  confirmRemove.currentOrderId ?? '',
      driverId: confirmRemove.id,
    })
    setConfirmRemove(null)
  }

  const handleActivate = (driver: Driver) => {
    dispatch({ type: 'UPDATE_DRIVER', driverId: driver.id, patch: { status: 'available' } })
    setExpandedId(null)
  }

  const handleReinstate = (driver: Driver) => {
    dispatch({ type: 'UPDATE_DRIVER', driverId: driver.id, patch: { status: 'offline' } })
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Drivers</div>
          <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
            {state.drivers.length} registered · click any card to expand
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '9px 18px', border: 'none', borderRadius: 8,
            background: 'var(--a-sidebar)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add driver
        </button>
      </div>

      {/* Pending activation banner */}
      {pendingCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', marginBottom: 20,
          background: 'var(--a-warn-bg)',
          border: '1.5px solid var(--a-warn)',
          borderRadius: 10, fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--a-ink)' }}>
              {pendingCount} driver{pendingCount > 1 ? 's' : ''} pending activation
            </strong>
            <span style={{ color: 'var(--a-muted)', marginLeft: 8 }}>
              — self-signed up and waiting for approval. Expand their card and click <strong>Activate driver</strong>.
            </span>
          </div>
          <button
            onClick={() => setFilter('offline')}
            style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: 'var(--a-warn)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            View offline
          </button>
        </div>
      )}

      {/* Stats */}
      <StatsBar drivers={state.drivers} />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => {
          const count = f === 'all'
            ? state.drivers.length
            : state.drivers.filter(d => d.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 13px', borderRadius: 999,
                border: filter === f ? 'none' : '1.5px solid var(--a-border)',
                background: filter === f ? 'var(--a-sidebar)' : '#fff',
                color: filter === f ? '#fff' : 'var(--a-ink2)',
                fontSize: 12, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : DRIVER_STATUS_LABELS[f]}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Instruction hint */}
      {expandedId === null && filtered.length > 0 && (
        <div style={{
          fontSize: 12, color: 'var(--a-muted)', marginBottom: 12,
          padding: '8px 14px', background: 'var(--a-bg)', borderRadius: 8,
          border: '1px dashed var(--a-border)',
        }}>
          💡 Click a driver card to expand and see details, contact info, active order, and actions.
          Only one card is expanded at a time.
        </div>
      )}

      {/* Cards list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--a-muted)' }}>
            No drivers in this category.
          </div>
        ) : filtered.map(driver => {
          const currentOrder = driver.currentOrderId
            ? state.orders.find(o => o.id === driver.currentOrderId)
            : undefined
          return (
            <DriverCard
              key={driver.id}
              driver={driver}
              isExpanded={expandedId === driver.id}
              onToggle={() => toggleExpand(driver.id)}
              onEdit={() => setEditDriver(driver)}
              onActivate={() => handleActivate(driver)}
              onAssignOrder={() => setAssignDriver(driver)}
              onRemoveFromOrder={() => setConfirmRemove(driver)}
              onSuspend={() => setConfirmSuspend(driver)}
              onReinstate={() => handleReinstate(driver)}
              onViewOrder={id => setViewOrderId(id)}
              currentOrder={currentOrder}
            />
          )
        })}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showAdd && (
        <Modal title="Add new driver" onClose={() => setShowAdd(false)}>
          <DriverForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {editDriver && (
        <Modal title={`Edit — ${editDriver.name}`} onClose={() => setEditDriver(null)}>
          <DriverForm initial={editDriver} isEdit onSave={handleEdit} onCancel={() => setEditDriver(null)} />
        </Modal>
      )}

      {assignDriver && (
        <Modal title={`Assign order to ${assignDriver.name}`} onClose={() => setAssignDriver(null)} width={520}>
          <AssignOrderModal
            driver={assignDriver}
            orders={state.orders}
            onAssign={handleAssignOrder}
            onClose={() => setAssignDriver(null)}
          />
        </Modal>
      )}

      {confirmSuspend && (
        <Modal title="Suspend driver" onClose={() => setConfirmSuspend(null)}>
          <ConfirmModal
            title="Suspend driver"
            body={
              <>
                Suspend <strong>{confirmSuspend.name}</strong>? They will be unable to accept or complete deliveries until reinstated.
              </>
            }
            danger
            confirmLabel="Suspend driver"
            onConfirm={handleSuspend}
            onCancel={() => setConfirmSuspend(null)}
          />
        </Modal>
      )}

      {confirmRemove && (
        <Modal title="Remove from active delivery" onClose={() => setConfirmRemove(null)}>
          <ConfirmModal
            title="Remove from order"
            body={
              <>
                Remove <strong>{confirmRemove.name}</strong> from order{' '}
                <strong>{confirmRemove.currentOrderId}</strong>?
                The order will return to <em>New</em> status and be available for reassignment.
              </>
            }
            confirmLabel="Remove from order"
            onConfirm={handleRemoveFromOrder}
            onCancel={() => setConfirmRemove(null)}
          />
        </Modal>
      )}

      {viewOrderId && (
        <OrderDetailPanel orderId={viewOrderId} onClose={() => setViewOrderId(null)} />
      )}
    </div>
  )
}
