import React, { useState, useEffect, useRef } from 'react'
import { OrderStatusBadge } from './StatusBadge'
import { AssignDriverModal } from './AssignDriverModal'
import { useAdminStore } from '../store/AdminContext'
import { fmt, fmtDateTime, fmtTime, parcelSizeLabel } from '@shared/utils/format'
import { NEXT_STATUSES, ORDER_STATUS_LABELS } from '@shared/types'
import type { OrderStatus } from '@shared/types'
import { getMessages, sendMessage, subscribeToMessages, type Message } from '@shared/utils/messageStore'

interface Props {
  orderId: string
  onClose: () => void
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--a-muted)', width: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--a-ink2)', flex: 1 }}>{value}</span>
    </div>
  )
}

/** Extract labelled media URLs from POD note text.
 *  Recognises "Door photo: <url>" and "Signature: <url>" tokens.
 *  Returns the cleaned text (URLs removed) and an array of { label, url } items.
 */
function parseNoteMedia(text: string): { cleanText: string; media: { label: string; url: string }[] } {
  const media: { label: string; url: string }[] = []
  const tokens: { key: string; label: string }[] = [
    { key: 'Door photo: ', label: 'Door photo' },
    { key: 'Signature: ',  label: 'Signature'  },
  ]
  let cleanText = text
  for (const { key, label } of tokens) {
    const idx = cleanText.indexOf(key)
    if (idx === -1) continue
    const start = idx + key.length
    // URL ends at next whitespace or end-of-string
    const end   = cleanText.indexOf(' ', start)
    const url   = end === -1 ? cleanText.slice(start) : cleanText.slice(start, end)
    if (url.startsWith('http')) {
      media.push({ label, url })
      // Remove the token + url (plus leading space if present)
      const full = cleanText.slice(idx === 0 ? 0 : idx - 1, end === -1 ? undefined : end)
      cleanText  = (cleanText.slice(0, idx > 0 ? idx - 1 : idx) + (end === -1 ? '' : cleanText.slice(end))).trim()
    }
  }
  return { cleanText, media }
}

function NoteCard({ note }: { note: { id: string; text: string; authorName: string; createdAt: string } }) {
  const { cleanText, media } = parseNoteMedia(note.text)
  return (
    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--a-border)' }}>
      <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginBottom: media.length ? 8 : 3, whiteSpace: 'pre-wrap' }}>
        {cleanText}
      </div>
      {media.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          {media.map(({ label, url }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
               title={`Open ${label} full size`}
               style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <img
                src={url}
                alt={label}
                style={{
                  width: 96, height: 72, objectFit: 'cover', borderRadius: 6,
                  border: '1px solid var(--a-border)', background: 'var(--a-bg)',
                }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span style={{ fontSize: 10, color: 'var(--a-muted)', fontWeight: 500 }}>{label}</span>
            </a>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--a-muted)' }}>
        {note.authorName} · {fmtDateTime(note.createdAt)}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
        color: 'var(--a-muted)', marginBottom: 10,
      }}>{title}</div>
      <div style={{
        background: 'var(--a-bg)', borderRadius: 8,
        padding: '12px 14px', border: '1px solid var(--a-border)',
      }}>{children}</div>
    </div>
  )
}

const STATUS_PIPELINE: OrderStatus[] = ['new', 'assigned', 'picked_up', 'in_transit', 'delivered']

export function OrderDetailPanel({ orderId, onClose }: Props) {
  const { state, dispatch } = useAdminStore()
  const [showAssign, setShowAssign]     = useState(false)
  const [showCancel, setShowCancel]     = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [noteText, setNoteText]         = useState('')
  const [messages, setMessages]         = useState<Message[]>([])
  const [adminReplyText, setAdminReplyText] = useState('')
  const [replySending, setReplySending]     = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const order = state.orders.find(o => o.id === orderId)

  useEffect(() => {
    if (!orderId) return
    getMessages(orderId).then(setMessages)
    return subscribeToMessages(orderId, setMessages)
  }, [orderId])

  if (!order) return null

  const receipt = state.receipts.find(r => r.orderId === orderId)
  const nextStatuses = NEXT_STATUSES[order.status] ?? []
  const driver = state.drivers.find(d => d.id === order.assignedDriverId)

  const handleStatusUpdate = (status: OrderStatus) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status })
  }

  const handleCancel = () => {
    if (!cancelReason.trim()) return
    dispatch({ type: 'CANCEL_ORDER', orderId, reason: cancelReason.trim() })
    setShowCancel(false)
    setCancelReason('')
  }

  const handleAdminSend = async () => {
    const text = adminReplyText.trim()
    if (!text || replySending) return
    // Determine receiver: prefer driver if assigned, otherwise customer
    const receiverId   = order.assignedDriverId ?? order.customerId
    const receiverRole: Message['receiverRole'] = order.assignedDriverId ? 'driver' : 'customer'
    setReplySending(true)
    try {
      await sendMessage({
        orderId:      order.id,
        senderId:     'admin',
        senderRole:   'admin',
        receiverId,
        receiverRole,
        messageText:  text,
      })
      setAdminReplyText('')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error('[AdminPanel] send failed', err)
    } finally {
      setReplySending(false)
    }
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    dispatch({
      type: 'ADD_NOTE', orderId,
      note: {
        id:         `n${Date.now()}`,
        text:       noteText.trim(),
        authorName: 'Admin',
        createdAt:  new Date().toISOString(),
      },
    })
    setNoteText('')
  }

  const p = order.priceBreakdown

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div
        className="panel-enter"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
          background: 'var(--a-surface)', zIndex: 201,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--a-border)', flexShrink: 0, background: '#fff',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--a-mono)', fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>
              {order.id}
            </div>
            <div style={{ marginTop: 4 }}>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 7, border: 'none',
              background: 'var(--a-bg)', color: 'var(--a-muted)',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Status pipeline */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--a-border)',
          flexShrink: 0, background: '#fafbfc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STATUS_PIPELINE.map((s, i) => {
              const done    = STATUS_PIPELINE.indexOf(order.status) > i
              const current = order.status === s
              const cancelled = order.status === 'cancelled'
              const color = cancelled ? 'var(--a-muted)'
                : done    ? 'var(--a-ok)'
                : current ? 'var(--a-accent)' : 'var(--a-border2)'
              return (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: color,
                      outline: current ? `2px solid ${color}` : 'none',
                      outlineOffset: 2,
                    }} />
                    <div style={{
                      fontSize: 9, marginTop: 4, color,
                      fontWeight: current ? 700 : 400, textAlign: 'center',
                      textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>
                      {ORDER_STATUS_LABELS[s].replace(' ', ' ')}
                    </div>
                  </div>
                  {i < STATUS_PIPELINE.length - 1 && (
                    <div style={{
                      flex: 2, height: 2, marginBottom: 14,
                      background: done || (current && STATUS_PIPELINE.indexOf(order.status) > i)
                        ? 'var(--a-ok)' : 'var(--a-border)',
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Pickup */}
          <Section title="Pickup">
            <Row label="Name"    value={order.pickup.name} />
            <Row label="Phone"   value={order.pickup.phone} />
            <Row label="Address" value={order.pickup.address} />
            {order.pickup.unit && <Row label="Unit" value={order.pickup.unit} />}
            {order.pickup.note && <Row label="Note" value={order.pickup.note} />}
          </Section>

          {/* Drop-off */}
          <Section title="Drop-off">
            <Row label="Name"    value={order.dropoff.name} />
            <Row label="Phone"   value={order.dropoff.phone} />
            <Row label="Address" value={order.dropoff.address} />
            {order.dropoff.unit && <Row label="Unit" value={order.dropoff.unit} />}
            {order.dropoff.note && <Row label="Note" value={order.dropoff.note} />}
          </Section>

          {/* Parcel */}
          <Section title="Parcel">
            <Row label="Size"        value={parcelSizeLabel(order.parcel.size)} />
            <Row label="Description" value={order.parcel.desc} />
            <Row label="Fragile"     value={order.parcel.fragile ? 'Yes' : 'No'} />
            <Row label="Distance"    value={`${order.distanceKm} km`} />
            <Row label="City"        value={order.cityId.charAt(0).toUpperCase() + order.cityId.slice(1)} />
            <Row
              label="Prohibited items"
              value={
                order.parcel.prohibitedItemsDeclarationAccepted
                  ? <span style={{ color: 'var(--a-ok)', fontWeight: 500 }}>
                      ✓ Declared {order.parcel.prohibitedItemsDeclarationAcceptedAt
                        ? `· ${fmtDateTime(order.parcel.prohibitedItemsDeclarationAcceptedAt)}`
                        : ''}
                    </span>
                  : <span style={{ color: 'var(--a-warn, #c94a1b)', fontWeight: 500 }}>Not declared</span>
              }
            />
          </Section>

          {/* Driver */}
          <Section title="Driver">
            {order.assignedDriverId && driver ? (
              <>
                <Row label="Name"   value={driver.name} />
                <Row label="Phone"  value={driver.phone} />
                <Row label="Rating" value={`★ ${driver.rating}`} />
                <Row label="Vehicle" value={driver.vehicle} />
              </>
            ) : (
              <div style={{ color: 'var(--a-muted)', fontSize: 13, marginBottom: 2 }}>No driver assigned</div>
            )}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button
                onClick={() => setShowAssign(true)}
                style={{
                  marginTop: 10, padding: '7px 14px', border: '1.5px solid var(--a-border)',
                  borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 500, color: 'var(--a-ink)',
                }}
              >
                {order.assignedDriverId ? 'Reassign driver' : 'Assign driver'}
              </button>
            )}
          </Section>

          {/* Price breakdown */}
          <Section title="Price Breakdown">
            {[
              { label: 'Base fee',         value: p.baseFee,      show: true },
              { label: 'Distance surcharge', value: p.distanceFee, show: p.distanceFee > 0 },
              { label: 'Size surcharge',    value: p.sizeFee,      show: p.sizeFee > 0 },
              { label: 'Fragile handling',  value: p.fragileFee,   show: p.fragileFee > 0 },
              { label: 'GST (5%)',          value: p.gst,          show: p.gst > 0 },
              { label: 'PST (7%)',          value: p.pst,          show: p.pst > 0 },
              { label: 'HST (13%)',         value: p.hst,          show: p.hst > 0 },
              { label: 'QST (9.975%)',      value: p.qst,          show: p.qst > 0 },
              { label: 'Tip',               value: p.tip,          show: p.tip > 0 },
            ].filter(r => r.show).map(r => (
              <Row key={r.label} label={r.label} value={fmt(r.value)} />
            ))}
            <div style={{ borderTop: '1px solid var(--a-border)', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--a-mono)' }}>{fmt(p.total)}</span>
            </div>
            {receipt && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a-ok)' }}>
                ✓ Receipt {receipt.id} · {receipt.brand.toUpperCase()} ···· {receipt.last4}
              </div>
            )}
          </Section>

          {/* Cancel reason (if cancelled) */}
          {order.status === 'cancelled' && order.cancelReason && (
            <Section title="Cancellation Reason">
              <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{order.cancelReason}</div>
            </Section>
          )}

          {/* Notes */}
          <Section title="Internal Notes">
            {order.notes.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 10 }}>No notes yet.</div>
            )}
            {order.notes.map(n => <NoteCard key={n.id} note={n} />)}
            {order.status !== 'cancelled' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add an internal note…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
                  style={{
                    flex: 1, padding: '7px 10px', border: '1.5px solid var(--a-border)',
                    borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff',
                  }}
                />
                <button
                  onClick={handleAddNote}
                  style={{
                    padding: '7px 12px', border: 'none', borderRadius: 6,
                    background: 'var(--a-sidebar)', color: '#fff', fontSize: 12, fontWeight: 500,
                  }}
                >Add</button>
              </div>
            )}
          </Section>

          {/* Messages thread */}
          <Section title={`Messages${messages.length > 0 ? ` (${messages.length})` : ''}`}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 12 }}>No messages for this order.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {messages.map(m => {
                  const isAdmin    = m.senderRole === 'admin'
                  const isCustomer = m.senderRole === 'customer'
                  // align: admin → right (purple), customer → left (grey), driver → right-ish (green)
                  const alignRight = isAdmin || !isCustomer
                  const bubbleBg = isAdmin
                    ? 'var(--a-sidebar)'
                    : isCustomer
                    ? 'var(--a-bg)'
                    : 'var(--a-ok, #16a34a)'
                  const bubbleColor = isCustomer ? 'var(--a-ink2)' : '#fff'
                  const borderRadius = alignRight
                    ? '10px 10px 3px 10px'
                    : '10px 10px 10px 3px'
                  const roleLabel = isAdmin ? 'Admin' : isCustomer ? 'Customer' : 'Driver'
                  const roleLabelColor = isAdmin
                    ? 'var(--a-sidebar)'
                    : isCustomer
                    ? 'var(--a-accent)'
                    : 'var(--a-ok)'
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: alignRight ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%', padding: '8px 11px',
                        background: bubbleBg,
                        color: bubbleColor,
                        borderRadius,
                        border: isCustomer ? '1px solid var(--a-border)' : 'none',
                        fontSize: 13, lineHeight: 1.45,
                      }}>
                        {m.messageText}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--a-muted)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{
                          textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600,
                          fontSize: 9, color: roleLabelColor,
                        }}>
                          {roleLabel}
                        </span>
                        · {fmtTime(m.createdAt)}
                        {m.isRead && <span style={{ color: 'var(--a-ok)' }}>· Read</span>}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Admin reply input */}
            <div style={{ display: 'flex', gap: 8, marginTop: messages.length > 0 ? 0 : 4 }}>
              <input
                value={adminReplyText}
                onChange={e => setAdminReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdminSend() } }}
                placeholder="Reply as admin…"
                disabled={replySending}
                style={{
                  flex: 1, padding: '7px 10px', border: '1.5px solid var(--a-border)',
                  borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff',
                  opacity: replySending ? 0.6 : 1,
                }}
              />
              <button
                onClick={handleAdminSend}
                disabled={!adminReplyText.trim() || replySending}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 6,
                  background: adminReplyText.trim() && !replySending ? 'var(--a-sidebar)' : 'var(--a-border)',
                  color: adminReplyText.trim() && !replySending ? '#fff' : 'var(--a-muted)',
                  fontSize: 12, fontWeight: 600, transition: 'background 0.15s',
                  cursor: adminReplyText.trim() && !replySending ? 'pointer' : 'default',
                }}
              >{replySending ? '…' : 'Send'}</button>
            </div>
          </Section>

          {/* Timestamps */}
          <div style={{ fontSize: 11, color: 'var(--a-muted)', paddingBottom: 8 }}>
            Created: {fmtDateTime(order.createdAt)} · Updated: {fmtDateTime(order.updatedAt)}
          </div>
        </div>

        {/* Action footer */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--a-border)',
            display: 'flex', gap: 8, flexShrink: 0, background: '#fff',
          }}>
            {/* Next status buttons */}
            {nextStatuses.filter(s => s !== 'cancelled').map(s => (
              <button
                key={s}
                onClick={() => handleStatusUpdate(s)}
                style={{
                  flex: 1, padding: '9px 0', border: 'none', borderRadius: 7,
                  background: 'var(--a-sidebar)', color: '#fff',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Mark as {ORDER_STATUS_LABELS[s]}
              </button>
            ))}

            {/* Cancel */}
            {!showCancel ? (
              <button
                onClick={() => setShowCancel(true)}
                style={{
                  padding: '9px 14px', border: '1.5px solid var(--a-err)',
                  borderRadius: 7, background: '#fff', color: 'var(--a-err)',
                  fontSize: 13, fontWeight: 500,
                }}
              >Cancel</button>
            ) : (
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation"
                  style={{
                    flex: 1, padding: '7px 10px', border: '1.5px solid var(--a-err)',
                    borderRadius: 6, fontSize: 12, outline: 'none',
                  }}
                />
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '7px 12px', border: 'none', borderRadius: 6,
                    background: 'var(--a-err)', color: '#fff', fontSize: 12, fontWeight: 600,
                  }}
                >Confirm</button>
                <button
                  onClick={() => { setShowCancel(false); setCancelReason('') }}
                  style={{
                    padding: '7px 10px', border: '1.5px solid var(--a-border)',
                    borderRadius: 6, background: '#fff', fontSize: 12, color: 'var(--a-muted)',
                  }}
                >✕</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAssign && <AssignDriverModal orderId={orderId} onClose={() => setShowAssign(false)} />}
    </>
  )
}
