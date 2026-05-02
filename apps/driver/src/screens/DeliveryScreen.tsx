import React, { useState } from 'react'
import { useDriver } from '../store/DriverContext'
import type { DeliverySubstep } from '../store/DriverContext'
import { OrderStatusPill } from '../components/StatusPill'
import { Toast } from '../components/Toast'
import type { Order } from '@shared/types'
import { addIncident, newIncidentId } from '@shared/utils/incidentStore'
import { pushNotification } from '@shared/utils/notificationStore'

interface Props {
  orderId: string
  onBack:  () => void
  onComplete: (orderId: string) => void   // triggers proof-of-delivery screen
}

// ── Delivery steps definition ─────────────────────────────────────────────────

interface Step {
  id:      DeliverySubstep | 'done'
  label:   string
  short:   string
}

const STEPS: Step[] = [
  { id: 'accepted',       label: 'Heading to Pickup', short: 'Pickup'    },
  { id: 'at_pickup',      label: 'Arrived at Pickup', short: 'At Pickup' },
  { id: 'picked_up',      label: 'Heading to Drop-off', short: 'Drop-off' },
  { id: 'at_dropoff',     label: 'Arrived at Drop-off', short: 'At Drop-off' },
  { id: 'done',           label: 'Delivered',          short: 'Done'     },
]

const SIZE_LABEL: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }

function fmtPhone(p: string) { return p.replace(/(\d{3})\s?(\d{3})\s?(\d{4})/, '$1 $2 $3') }

// ── Issue types ───────────────────────────────────────────────────────────────

const ISSUE_TYPES = [
  'Cannot find the address',
  'Customer / recipient not available',
  'Package appears damaged',
  'Access denied to building',
  'Safety concern at location',
  'Wrong address on order',
  'Other issue',
]

// ── ReportIssueSheet ──────────────────────────────────────────────────────────

function ReportIssueSheet({
  order, onClose, onSubmit,
}: { order: Order; onClose: () => void; onSubmit: (issue: string, detail: string) => void }) {
  const [selected, setSelected] = useState('')
  const [detail,   setDetail]   = useState('')

  return (
    <div className="d-overlay" onClick={onClose}>
      <div className="d-sheet" onClick={e => e.stopPropagation()}>
        <div className="d-sheet-handle" />
        <div className="d-sheet-title">⚠️ Report an Issue</div>
        <div style={{ padding: '4px 20px 16px', fontSize: 13, color: 'var(--d-muted)' }}>
          For {order.id} · {order.pickup.name} → {order.dropoff.name}
        </div>
        <div style={{ padding: '0 16px' }}>
          {ISSUE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelected(type)}
              style={{
                width: '100%', padding: '12px 14px', marginBottom: 6,
                background: selected === type ? 'var(--d-accent-lt)' : 'var(--d-surface-2)',
                border: `1.5px solid ${selected === type ? 'var(--d-accent)' : 'var(--d-border)'}`,
                borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                fontSize: 14, fontWeight: selected === type ? 600 : 400,
                color: selected === type ? 'var(--d-accent)' : 'var(--d-ink)',
              }}
            >{type}</button>
          ))}
          <textarea
            className="d-input"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="Additional details (optional)…"
            style={{ marginTop: 6, minHeight: 70 }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingBottom: 8 }}>
            <button className="d-btn d-btn-outline d-btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              className="d-btn d-btn-danger d-btn-sm"
              style={{ flex: 2, opacity: selected ? 1 : 0.5 }}
              disabled={!selected}
              onClick={() => onSubmit(selected, detail)}
            >Submit Report</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DeliveryScreen({ orderId, onBack, onComplete }: Props) {
  const { state, dispatch } = useDriver()
  const [showIssue,  setShowIssue]  = useState(false)
  const [toast,      setToast]      = useState('')
  const [confirming, setConfirming] = useState(false)

  const order = state.orders.find(o => o.id === orderId)
  if (!order) return (
    <div className="d-scroll" style={{ padding: 24, textAlign: 'center', color: 'var(--d-muted)' }}>
      Order not found.
      <br />
      <button className="d-btn d-btn-outline" style={{ marginTop: 16, maxWidth: 200 }} onClick={onBack}>Back</button>
    </div>
  )

  const substep = state.substeps[orderId]

  // ── Determine current step index ──────────────────────────────────────────
  const stepIndex = (() => {
    if (order.status === 'delivered') return 4
    if (substep === 'at_dropoff')    return 3
    if (substep === 'picked_up' || order.status === 'in_transit') return 2
    if (substep === 'at_pickup' || order.status === 'picked_up')  return 1
    return 0 // assigned / accepted / heading to pickup
  })()

  // ── Action handlers ────────────────────────────────────────────────────────

  const setSubstep = (s: DeliverySubstep) =>
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: s })

  const updateStatus = (status: 'picked_up' | 'in_transit' | 'delivered') =>
    dispatch({ type: 'UPDATE_STATUS', orderId, status })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const handleAccept = () => {
    setSubstep('accepted')
    showToast('Job accepted — heading to pickup')
  }

  const handleArrivedPickup = () => {
    setSubstep('at_pickup')
    showToast('Arrived at pickup location')
  }

  const handleConfirmPickup = () => {
    setConfirming(true)
    setTimeout(() => {
      updateStatus('picked_up')
      setSubstep('picked_up')
      setConfirming(false)
      showToast('Parcel picked up ✓')
    }, 400)
  }

  const handleArrivedDropoff = () => {
    updateStatus('in_transit')
    setSubstep('at_dropoff')
    showToast('Arrived at drop-off location')
  }

  const handleCompleteDelivery = () => onComplete(orderId)

  const handleIssueSubmit = (issue: string, detail: string) => {
    const text = detail ? `${issue}: ${detail}` : issue
    const now  = new Date().toISOString()

    // Add admin note on the order (visible in admin order detail)
    dispatch({
      type: 'ADD_NOTE',
      orderId,
      note: {
        id:         `note-${Date.now()}`,
        text:       `⚠️ Driver reported: ${text}`,
        authorName: state.auth?.name ?? 'Driver',
        createdAt:  now,
      },
    })

    // File a proper incident report (visible in admin Incidents screen)
    addIncident({
      id:           newIncidentId(),
      orderId,
      source:       'driver',
      reporterId:   state.auth?.driverId ?? 'unknown',
      reporterName: state.auth?.name ?? 'Driver',
      category:     issue,
      description:  detail || issue,
      severity:     issue.toLowerCase().includes('damage') || issue.toLowerCase().includes('safety') ? 'high' : 'medium',
      status:       'new',
      notes:        [],
      createdAt:    now,
      updatedAt:    now,
    })

    // Notify admin
    pushNotification({
      event:    'issue_reported',
      audience: 'admin',
      orderId,
      title:    'Incident reported by driver',
      body:     `${state.auth?.name ?? 'Driver'}: ${text}`,
      driverId: state.auth?.driverId,
    })

    setShowIssue(false)
    showToast('Issue reported to admin ✓')
  }

  const mockCall = (name: string, phone: string) => {
    showToast(`📞 Calling ${name} (${fmtPhone(phone)})`)
  }

  const mockNav = (address: string) => {
    const encoded = encodeURIComponent(address)
    window.open(`https://maps.google.com/?q=${encoded}`, '_blank')
  }

  const isDelivered = order.status === 'delivered' || order.status === 'cancelled'

  // ── Primary action for current step ────────────────────────────────────────
  const primaryAction = (() => {
    if (isDelivered) return null
    if (!substep && order.status === 'assigned') return { label: '✓ Accept Job', fn: handleAccept, cls: 'd-btn-primary' }
    if (substep === 'accepted') return { label: '📍 Arrived at Pickup', fn: handleArrivedPickup, cls: 'd-btn-primary' }
    if (substep === 'at_pickup') return { label: '📦 Confirm Pickup', fn: handleConfirmPickup, cls: 'd-btn-success', loading: confirming }
    if (substep === 'picked_up' || order.status === 'in_transit') return { label: '📍 Arrived at Drop-off', fn: handleArrivedDropoff, cls: 'd-btn-primary' }
    if (substep === 'at_dropoff') return { label: '✅ Complete Delivery', fn: handleCompleteDelivery, cls: 'd-btn-success' }
    return null
  })()

  return (
    <>
      <div className="d-scroll">
        {/* Step indicator */}
        <div style={{ background: 'var(--d-surface)', padding: '0 16px 12px', marginBottom: 10 }}>
          <div className="d-steps">
            {STEPS.map((step, i) => {
              const done   = i < stepIndex
              const active = i === stepIndex
              return (
                <React.Fragment key={step.id}>
                  {i > 0 && <div className={`d-step-line${done ? ' d-step-line-done' : ''}`} />}
                  <div className="d-step">
                    <div className={`d-step-circle ${done ? 'd-step-circle-done' : active ? 'd-step-circle-active' : 'd-step-circle-pending'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <div className={`d-step-label${active ? ' d-step-label-active' : ''}`}>{step.short}</div>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px' }}>

          {/* Status + order ID */}
          <div className="d-card">
            <div className="d-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 4 }}>ORDER</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--d-ink)' }}>{order.id}</div>
                </div>
                <OrderStatusPill status={order.status} />
              </div>
            </div>

            {/* Fragile warning */}
            {order.parcel.fragile && (
              <div className="d-card-section" style={{ padding: '10px 16px' }}>
                <div className="d-fragile-banner">
                  <span>⚠️</span>
                  <span>FRAGILE — Handle with care</span>
                </div>
              </div>
            )}

            {/* Parcel */}
            <div className="d-card-section">
              <div className="d-label">Parcel</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--d-ink)' }}>{order.parcel.desc}</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 3 }}>
                {SIZE_LABEL[order.parcel.size]} · {order.distanceKm} km route
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div className="d-card">
            <div className="d-card-section">
              <div className="d-label">📦 Pickup from</div>
              <div className="d-addr-row">
                <div className="d-addr-dot d-addr-dot-green" />
                <div style={{ flex: 1 }}>
                  <div className="d-addr-name">{order.pickup.name}</div>
                  <div className="d-addr-text">{order.pickup.address}</div>
                  {order.pickup.unit && <div className="d-addr-text">Unit {order.pickup.unit}</div>}
                  {order.pickup.note && (
                    <div style={{ fontSize: 12, color: '#d97706', marginTop: 4, fontWeight: 500 }}>
                      📌 {order.pickup.note}
                    </div>
                  )}
                </div>
              </div>
              <div className="d-contact-row">
                <button className="d-contact-btn" onClick={() => mockCall(order.pickup.name, order.pickup.phone)}>
                  📞 Call
                </button>
                <button className="d-contact-btn" onClick={() => mockNav(order.pickup.address)}>
                  🗺️ Navigate
                </button>
              </div>
            </div>
          </div>

          {/* Drop-off */}
          <div className="d-card">
            <div className="d-card-section">
              <div className="d-label">📍 Drop-off to</div>
              <div className="d-addr-row">
                <div className="d-addr-dot d-addr-dot-orange" />
                <div style={{ flex: 1 }}>
                  <div className="d-addr-name">{order.dropoff.name}</div>
                  <div className="d-addr-text">{order.dropoff.address}</div>
                  {order.dropoff.unit && <div className="d-addr-text">Unit {order.dropoff.unit}</div>}
                  {order.dropoff.note && (
                    <div style={{ fontSize: 12, color: '#d97706', marginTop: 4, fontWeight: 500 }}>
                      📌 {order.dropoff.note}
                    </div>
                  )}
                </div>
              </div>
              <div className="d-contact-row">
                <button className="d-contact-btn" onClick={() => mockCall(order.dropoff.name, order.dropoff.phone)}>
                  📞 Call
                </button>
                <button className="d-contact-btn" onClick={() => mockNav(order.dropoff.address)}>
                  🗺️ Navigate
                </button>
              </div>
            </div>
          </div>

          {/* Admin notes */}
          {order.notes.length > 0 && (
            <div className="d-card">
              <div className="d-card-section">
                <div className="d-label">Admin Notes</div>
                {order.notes.map(n => (
                  <div key={n.id} style={{
                    padding: '8px 10px', background: 'var(--d-warn-bg)', borderRadius: 8,
                    border: '1px solid var(--d-warn-border)', marginBottom: 6,
                    fontSize: 13, color: '#92400e', lineHeight: 1.4,
                  }}>
                    {n.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report issue button */}
          {!isDelivered && (
            <button
              onClick={() => setShowIssue(true)}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--d-surface)', border: '1.5px solid var(--d-err-border)',
                borderRadius: 'var(--d-radius)', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, color: 'var(--d-err)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              ⚠️ Report an Issue
            </button>
          )}

          {/* Delivered confirmation */}
          {order.status === 'delivered' && (
            <div style={{
              padding: '20px 16px', background: 'var(--d-ok-bg)', borderRadius: 'var(--d-radius)',
              border: '1.5px solid var(--d-ok-border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-ok)', marginBottom: 4 }}>Delivery Complete!</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>
                Order {order.id} has been delivered.
              </div>
            </div>
          )}

          {/* Cancelled */}
          {order.status === 'cancelled' && (
            <div style={{
              padding: '16px', background: 'var(--d-err-bg)', borderRadius: 'var(--d-radius)',
              border: '1px solid var(--d-err-border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-err)', marginBottom: 4 }}>Order Cancelled</div>
              {order.cancelReason && (
                <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{order.cancelReason}</div>
              )}
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {/* Bottom action bar */}
      {primaryAction && (
        <div className="d-bottom-bar">
          <button
            className={`d-btn ${primaryAction.cls}`}
            onClick={primaryAction.fn}
            disabled={'loading' in primaryAction && primaryAction.loading}
          >
            {'loading' in primaryAction && primaryAction.loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Confirming…
                </span>
              : primaryAction.label}
          </button>
        </div>
      )}

      {/* Issue sheet */}
      {showIssue && (
        <ReportIssueSheet order={order} onClose={() => setShowIssue(false)} onSubmit={handleIssueSubmit} />
      )}

      {/* Toast */}
      {toast && <div className="d-toast">{toast}</div>}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
