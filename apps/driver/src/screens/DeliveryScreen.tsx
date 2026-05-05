import React, { useState, useEffect, useRef } from 'react'
import { useDriver } from '../store/DriverContext'
import type { DeliverySubstep } from '../store/DriverContext'
import { OrderStatusPill } from '../components/StatusPill'
import { Toast } from '../components/Toast'
import type { Order } from '@shared/types'
import { addIncident, newIncidentId } from '@shared/utils/incidentStore'
import { pushNotification } from '@shared/utils/notificationStore'
import {
  getMessages, sendMessage, subscribeToMessages, markMessagesRead,
  type Message,
} from '@shared/utils/messageStore'
import { fmtTime } from '@shared/utils/format'

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

// ── ChatPanel ─────────────────────────────────────────────────────────────────

function ChatPanel({
  order, myId, onClose,
}: { order: Order; myId: string; onClose: () => void }) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending,   setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const customerId  = order.customerId
  const isTerminal  = order.status === 'delivered' || order.status === 'cancelled'

  // Load + subscribe
  useEffect(() => {
    getMessages(order.id).then(setMessages)
    const unsub = subscribeToMessages(order.id, setMessages)
    return unsub
  }, [order.id])

  // Mark read when panel opens
  useEffect(() => {
    if (myId) markMessagesRead(order.id, myId)
  }, [order.id, myId, messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !customerId || isTerminal) return
    setSending(true)
    setInputText('')
    await sendMessage({
      orderId:      order.id,
      senderId:     myId,
      senderRole:   'driver',
      receiverId:   customerId,
      receiverRole: 'customer',
      messageText:  text,
    })
    // Re-fetch immediately — don't rely on realtime alone
    const refreshed = await getMessages(order.id)
    setMessages(refreshed)
    setSending(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--d-surface, #f5f6f8)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: 'var(--d-accent, #2563eb)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: 'none', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {order.pickup.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
            {order.id} · {isTerminal ? 'Delivery closed' : 'Customer'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--d-muted)', fontSize: 13, marginTop: 40 }}>
            No messages yet. Say hello!
          </div>
        )}
        {messages.map(m => {
          const isMine = m.senderId === myId
          const isRead = m.isRead
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '9px 13px',
                background: isMine ? 'var(--d-accent, #2563eb)' : '#fff',
                color: isMine ? '#fff' : 'var(--d-ink, #1a1d23)',
                borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: 14, lineHeight: 1.45,
              }}>
                {m.messageText}
                <div style={{
                  fontSize: 10, marginTop: 4, opacity: 0.7,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                }}>
                  {fmtTime(m.createdAt)}
                  {isMine && (
                    <span style={{ color: isRead ? '#4ade80' : 'inherit', fontSize: 11 }}>
                      {isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isTerminal ? (
        <div style={{
          padding: '14px 16px', background: '#fff', borderTop: '1px solid var(--d-border, #e8ebf0)',
          textAlign: 'center', fontSize: 13, color: 'var(--d-muted)',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        }}>
          Messaging is closed for this delivery.
        </div>
      ) : (
        <div style={{
          padding: '10px 12px', background: '#fff',
          borderTop: '1px solid var(--d-border, #e8ebf0)',
          display: 'flex', gap: 8, alignItems: 'flex-end',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Message customer…"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid var(--d-border, #e8ebf0)',
              borderRadius: 20, padding: '9px 14px', fontSize: 14,
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
              background: 'var(--d-surface, #f5f6f8)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: inputText.trim() ? 'var(--d-accent, #2563eb)' : 'var(--d-border, #e8ebf0)',
              color: inputText.trim() ? '#fff' : 'var(--d-muted)',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default', flexShrink: 0,
            }}
          >↑</button>
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DeliveryScreen({ orderId, onBack, onComplete }: Props) {
  const { state, dispatch } = useDriver()
  const [showIssue,  setShowIssue]  = useState(false)
  const [toast,      setToast]      = useState('')
  const [confirming, setConfirming] = useState(false)
  const [chatOpen,   setChatOpen]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const myId = state.auth?.driverId ?? ''

  const order = state.orders.find(o => o.id === orderId)

  // Track unread messages from customer
  useEffect(() => {
    if (!order || !myId) return
    const updateUnread = (msgs: Message[]) => {
      setUnreadCount(msgs.filter(m => m.receiverId === myId && !m.isRead).length)
    }
    getMessages(order.id).then(updateUnread)
    return subscribeToMessages(order.id, updateUnread)
  }, [order?.id, myId])

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

            {/* Chat button */}
            {!isDelivered && order.customerId && (
              <div className="d-card-section" style={{ padding: '10px 16px', borderTop: '1px solid var(--d-border, #e8ebf0)' }}>
                <button
                  onClick={() => setChatOpen(true)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--d-accent-lt, #eff6ff)',
                    border: '1.5px solid var(--d-accent, #2563eb)',
                    borderRadius: 10, cursor: 'pointer',
                    fontSize: 14, fontWeight: 600, color: 'var(--d-accent, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    position: 'relative',
                  }}
                >
                  💬 Message Customer
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 8, right: 12,
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: '#f97316', color: '#fff',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px',
                    }}>{unreadCount}</span>
                  )}
                </button>
              </div>
            )}

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

      {/* Chat panel */}
      {chatOpen && order && myId && (
        <ChatPanel order={order} myId={myId} onClose={() => setChatOpen(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
