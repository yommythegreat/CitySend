import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDriver } from '../store/DriverContext'
import type { DeliverySubstep } from '../store/DriverContext'
import { Toast } from '../components/Toast'
import { SlideAction } from '../components/SlideAction'
import { NavigationBanner } from '../components/NavigationBanner'
import type { Order } from '@shared/types'
import { addIncident, newIncidentId } from '@shared/utils/incidentStore'
import { pushNotification } from '@shared/utils/notificationStore'
import {
  getMessages, sendMessage, subscribeToMessages, markMessagesRead,
  type Message,
} from '@shared/utils/messageStore'
import { fmtTime } from '@shared/utils/format'

interface Props {
  orderId:    string
  onBack:     () => void
  onComplete: (orderId: string) => void
}

const SIZE_LABEL: Record<string, string> = { s: 'Small', m: 'Medium', l: 'Large' }

// ── Map helper ────────────────────────────────────────────────────────────────

/** Build a Google Maps embed URL for a given address */
function googleMapsEmbedUrl(address: string): string {
  const encoded = encodeURIComponent(address)
  return `https://maps.google.com/maps?q=${encoded}&t=m&z=15&output=embed&iwloc=near`
}

/** Open Google Maps navigation in new tab */
function openMapsNav(address: string) {
  window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}&dirflg=d`, '_blank')
}

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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#fff', borderRadius: '20px 20px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ padding: 8, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: '#e0e0e0', borderRadius: 2 }} />
        </div>
        <div style={{ padding: '4px 20px 16px', fontSize: 18, fontWeight: 700, color: 'var(--d-ink)' }}>
          ⚠️ Report an Issue
        </div>
        <div style={{ padding: '0 4px 4px 20px', fontSize: 13, color: 'var(--d-muted)', marginBottom: 8 }}>
          {order.id} · {order.pickup.name} → {order.dropoff.name}
        </div>
        <div style={{ padding: '0 16px' }}>
          {ISSUE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelected(type)}
              style={{
                width: '100%', padding: '12px 14px', marginBottom: 6,
                background: selected === type ? 'rgba(201,74,27,0.08)' : '#f8f9fb',
                border: `1.5px solid ${selected === type ? 'var(--d-accent)' : '#e8ebf0'}`,
                borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                fontSize: 14, fontWeight: selected === type ? 600 : 400,
                color: selected === type ? 'var(--d-accent)' : 'var(--d-ink)',
              }}
            >{type}</button>
          ))}
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder="Additional details (optional)…"
            style={{
              marginTop: 6, minHeight: 70, width: '100%', boxSizing: 'border-box',
              border: '1.5px solid #e8ebf0', borderRadius: 10, padding: '10px 12px',
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingBottom: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '12px 0', border: '1.5px solid #e8ebf0',
                borderRadius: 10, background: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: 'var(--d-ink)',
              }}
            >Cancel</button>
            <button
              disabled={!selected}
              onClick={() => selected && onSubmit(selected, detail)}
              style={{
                flex: 2, padding: '12px 0', border: 'none',
                borderRadius: 10, background: selected ? '#ef4444' : '#e8ebf0',
                color: selected ? '#fff' : '#aaa', cursor: selected ? 'pointer' : 'default',
                fontSize: 14, fontWeight: 700,
              }}
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

  const customerId = order.customerId
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'

  useEffect(() => {
    getMessages(order.id).then(setMessages)
    const unsub = subscribeToMessages(order.id, setMessages)
    return unsub
  }, [order.id])

  useEffect(() => {
    if (myId) markMessagesRead(order.id, myId)
  }, [order.id, myId, messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !customerId || isTerminal) return
    setSending(true)
    setInputText('')
    await sendMessage({
      orderId: order.id, senderId: myId, senderRole: 'driver',
      receiverId: customerId, receiverRole: 'customer', messageText: text,
    })
    const refreshed = await getMessages(order.id)
    setMessages(refreshed)
    setSending(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 150,
      background: 'var(--d-surface, #f5f6f8)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 16px', background: 'var(--d-accent)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{order.pickup.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
            {order.id} · {isTerminal ? 'Delivery closed' : 'Customer'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--d-muted)', fontSize: 13, marginTop: 40 }}>
            No messages yet.
          </div>
        )}
        {messages.map(m => {
          const isMine = m.senderId === myId
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '9px 13px',
                background: isMine ? 'var(--d-accent)' : '#fff',
                color: isMine ? '#fff' : 'var(--d-ink)',
                borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: 14, lineHeight: 1.45,
              }}>
                {m.messageText}
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                  {fmtTime(m.createdAt)}
                  {isMine && <span style={{ color: m.isRead ? '#4ade80' : 'inherit', fontSize: 11 }}>{m.isRead ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {isTerminal ? (
        <div style={{ padding: '14px 16px', background: '#fff', borderTop: '1px solid var(--d-border)', textAlign: 'center', fontSize: 13, color: 'var(--d-muted)' }}>
          Messaging is closed for this delivery.
        </div>
      ) : (
        <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid var(--d-border)', display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Message customer…"
            rows={1}
            style={{ flex: 1, resize: 'none', border: '1.5px solid var(--d-border)', borderRadius: 20, padding: '9px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.4, background: '#f5f6f8' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: inputText.trim() ? 'var(--d-accent)' : 'var(--d-border)',
              color: inputText.trim() ? '#fff' : 'var(--d-muted)',
              fontSize: 16, cursor: inputText.trim() ? 'pointer' : 'default', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >↑</button>
        </div>
      )}
    </div>
  )
}

// ── Step logic ────────────────────────────────────────────────────────────────

type FlowStep =
  | 'en_route_pickup'     // Heading to pickup
  | 'at_pickup'           // At pickup — confirm parcel
  | 'en_route_dropoff'    // Heading to drop-off
  | 'at_dropoff'          // At drop-off — proof of delivery prompt

function resolveStep(
  order: Order,
  substep: DeliverySubstep | undefined,
): FlowStep {
  if (order.status === 'delivered') return 'at_dropoff'
  if (substep === 'at_dropoff')     return 'at_dropoff'
  if (substep === 'picked_up' || order.status === 'in_transit') return 'en_route_dropoff'
  if (substep === 'at_pickup')      return 'at_pickup'
  return 'en_route_pickup'
}

// ── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--d-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--d-ink)', fontWeight: 500, textAlign: 'right', marginLeft: 12 }}>{value}</span>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DeliveryScreen({ orderId, onBack, onComplete }: Props) {
  const { state, dispatch } = useDriver()

  const [toast,       setToast]       = useState('')
  const [showIssue,   setShowIssue]   = useState(false)
  const [chatOpen,    setChatOpen]    = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [photoAdded,  setPhotoAdded]  = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [sheetOpen,   setSheetOpen]   = useState(true)
  const [showBanner,  setShowBanner]  = useState(true)

  const myId   = state.auth?.driverId ?? ''
  const order  = state.orders.find(o => o.id === orderId)
  const substep = order ? state.substeps[order.id] : undefined

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
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--d-muted)' }}>
      Order not found.
      <br />
      <button
        onClick={onBack}
        style={{ marginTop: 16, padding: '10px 20px', background: 'var(--d-accent)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
      >
        Back
      </button>
    </div>
  )

  const step = resolveStep(order, substep)

  // Determine map target
  const mapAddress = (step === 'en_route_pickup' || step === 'at_pickup')
    ? order.pickup.address
    : order.dropoff.address

  // ── Navigation instruction ────────────────────────────────────────────────

  const navInstruction = (() => {
    if (step === 'en_route_pickup')  return `Head to ${order.pickup.address.split(',')[0]}`
    if (step === 'at_pickup')        return 'AT PICKUP — Confirm the parcel'
    if (step === 'en_route_dropoff') return `Head to ${order.dropoff.address.split(',')[0]}`
    if (step === 'at_dropoff')       return 'AT DROP-OFF — Hand it off'
    return ''
  })()

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleArrivedPickup = useCallback(async () => {
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_pickup' })
    setShowBanner(true)
    setToast('Arrived at pickup! Confirm the parcel.')
    setTimeout(() => setToast(''), 2000)
  }, [dispatch, orderId])

  const handleConfirmPickup = useCallback(async () => {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 400))
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'picked_up' })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'picked_up' })
    setShowBanner(true)
    setConfirming(false)
    setToast('Parcel confirmed! Heading to drop-off.')
    setTimeout(() => setToast(''), 2200)
  }, [dispatch, orderId])

  const handleArrivedDropoff = useCallback(async () => {
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'in_transit' })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_dropoff' })
    setShowBanner(true)
    setToast('Arrived at drop-off! Complete the delivery.')
    setTimeout(() => setToast(''), 2000)
  }, [dispatch, orderId])

  const handleCompleteDelivery = useCallback(() => {
    onComplete(orderId)
  }, [onComplete, orderId])

  const handleIssueSubmit = useCallback(async (issueType: string, detail: string) => {
    setShowIssue(false)
    const note = {
      id: `note-${Date.now()}`, text: `⚠️ Issue: ${issueType}${detail ? ' — ' + detail : ''}`,
      authorName: state.auth?.name ?? 'Driver', createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_NOTE', orderId, note })

    // File incident report
    await addIncident({
      id: newIncidentId(), orderId, source: 'driver',
      reporterId: myId, reporterName: state.auth?.name ?? 'Driver',
      category: issueType, description: detail, severity: 'medium',
      status: 'new', assignedTo: undefined, notes: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await pushNotification({
      event: 'issue_reported', audience: 'admin', orderId,
      title: 'Issue Reported', body: `Driver reported: ${issueType}`,
      driverId: myId,
    })
    setToast('Issue reported to admin.')
    setTimeout(() => setToast(''), 2500)
  }, [dispatch, myId, orderId, state.auth?.name])

  // ── Sheet content per step ────────────────────────────────────────────────

  const renderSheetContent = () => {
    // ── En route to pickup ────────────────────────────────────────────────
    if (step === 'en_route_pickup') {
      return (
        <>
          {/* Pickup label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,74,27,0.1)', color: 'var(--d-accent)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
            ● PICKUP · {order.id}
          </div>

          {/* Address */}
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 4 }}>
            {order.pickup.address.split(',')[0]}
          </div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginBottom: 16 }}>
            {order.pickup.address.split(',').slice(1).join(',')} {order.pickup.unit ? `· Unit ${order.pickup.unit}` : ''}
          </div>

          {/* Customer info */}
          <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {order.pickup.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{order.pickup.name}</div>
                <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{order.pickup.phone}</div>
              </div>
              <div style={{ flex: 1 }} />
              <a href={`tel:${order.pickup.phone}`} style={{ textDecoration: 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1.5px solid var(--d-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📞</div>
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>ETA</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-ink)', marginTop: 2 }}>4 min</div>
            </div>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>DISTANCE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-ink)', marginTop: 2 }}>{order.distanceKm} km</div>
            </div>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>PAYOUT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-accent)', marginTop: 2 }}>${(5.99 + order.distanceKm * 1.5).toFixed(2)}</div>
            </div>
          </div>

          {/* Navigate button */}
          <button
            onClick={() => openMapsNav(order.pickup.address)}
            style={{ width: '100%', padding: '12px 0', border: '1.5px solid var(--d-border)', borderRadius: 12, background: '#fff', fontSize: 14, fontWeight: 600, color: 'var(--d-ink)', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            🗺️ Open in Google Maps
          </button>

          {/* SLIDE to arrive */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SlideAction label="Slide when you've arrived" onSlideComplete={handleArrivedPickup} />
          </div>
        </>
      )
    }

    // ── At pickup — confirm parcel ─────────────────────────────────────────
    if (step === 'at_pickup') {
      return (
        <>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,74,27,0.1)', color: 'var(--d-accent)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
            ● AT PICKUP
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 16 }}>
            Confirm the parcel.
          </div>
          <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 16 }}>
            Match the package to the sender's records, then slide to confirm pickup.
          </div>

          {/* Customer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {order.pickup.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{order.pickup.name}</div>
              <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{order.pickup.address.split(',')[0]} {order.pickup.unit ? `· ${order.pickup.unit}` : ''}</div>
            </div>
            <div style={{ flex: 1 }} />
            <a href={`tel:${order.pickup.phone}`} style={{ textDecoration: 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f8f9fb', border: '1.5px solid var(--d-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📞</div>
            </a>
          </div>

          {/* Parcel details */}
          <div style={{ background: '#f8f9fb', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <DetailRow label="SIZE"        value={SIZE_LABEL[order.parcel.size]} />
            <DetailRow label="DESCRIPTION" value={order.parcel.desc} />
            {order.parcel.fragile && (
              <DetailRow label="HANDLING" value="⚠️ Fragile — keep upright" />
            )}
          </div>

          {/* Admin notes */}
          {order.notes.length > 0 && (
            <div style={{ background: '#fff8e7', border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
              {order.notes.map(n => n.text).join(' · ')}
            </div>
          )}

          {/* Photo proof */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Photo Proof</div>
            {!photoAdded ? (
              <button
                onClick={() => setPhotoAdded(true)}
                style={{ width: '100%', height: 80, border: '2px dashed var(--d-border)', borderRadius: 12, background: '#f8f9fb', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, color: 'var(--d-muted)' }}
              >
                <span style={{ fontSize: 22 }}>📷</span>
                Tap to capture photo
              </button>
            ) : (
              <div
                onClick={() => setPhotoAdded(false)}
                style={{ width: '100%', height: 80, border: '2px solid #22c55e', borderRadius: 12, background: 'rgba(34,197,94,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#22c55e', fontWeight: 600, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 22 }}>✓</span> Photo captured · tap to retake
              </div>
            )}
          </div>

          {/* Slide to confirm */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <SlideAction
              label={confirming ? 'Confirming…' : 'Slide to confirm pickup'}
              onSlideComplete={handleConfirmPickup}
              disabled={confirming}
              color="#22c55e"
            />
          </div>

          {/* Fallback actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowIssue(true)}
              style={{ flex: 1, padding: '10px 0', border: '1.5px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--d-ink)', cursor: 'pointer' }}
            >
              Wrong parcel?
            </button>
            <button
              onClick={() => setShowIssue(true)}
              style={{ flex: 1, padding: '10px 0', border: '1.5px solid #ef4444', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}
            >
              Cancel job
            </button>
          </div>
        </>
      )
    }

    // ── En route to drop-off ──────────────────────────────────────────────
    if (step === 'en_route_dropoff') {
      return (
        <>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,74,27,0.1)', color: 'var(--d-accent)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
            ● DROP-OFF · {order.id}
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 4 }}>
            {order.dropoff.address.split(',')[0]}
          </div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginBottom: 16 }}>
            {order.dropoff.address.split(',').slice(1).join(',')}
          </div>

          {/* Recipient info */}
          <div style={{ background: '#f8f9fb', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 4 }}>Recipient</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{order.dropoff.name}</div>
            {order.dropoff.phone && <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 2 }}>{order.dropoff.phone}</div>}
          </div>

          {/* Notes from sender */}
          {order.dropoff.note && (
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fc', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#3730a3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>NOTE FROM SENDER</div>
              {order.dropoff.note}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>ETA</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-ink)', marginTop: 2 }}>7 min</div>
            </div>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>DISTANCE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-ink)', marginTop: 2 }}>{order.distanceKm} km</div>
            </div>
            <div style={{ flex: 1, background: '#f8f9fb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>PAYOUT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--d-accent)', marginTop: 2 }}>${(5.99 + order.distanceKm * 1.5).toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={() => openMapsNav(order.dropoff.address)}
            style={{ width: '100%', padding: '12px 0', border: '1.5px solid var(--d-border)', borderRadius: 12, background: '#fff', fontSize: 14, fontWeight: 600, color: 'var(--d-ink)', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            🗺️ Open in Google Maps
          </button>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SlideAction label="Slide when you've arrived" onSlideComplete={handleArrivedDropoff} />
          </div>
        </>
      )
    }

    // ── At drop-off — proof of delivery ───────────────────────────────────
    if (step === 'at_dropoff') {
      return (
        <>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,74,27,0.1)', color: 'var(--d-accent)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
            ● AT DROP-OFF · {order.id}
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 4 }}>
            Hand it off.
          </div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginBottom: 16 }}>
            {order.dropoff.address.split(',')[0]} {order.dropoff.unit ? `· ${order.dropoff.unit}` : ''} · {order.dropoff.name}
          </div>

          {order.dropoff.note && (
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fc', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#3730a3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>NOTE FROM SENDER</div>
              {order.dropoff.note}
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 16 }}>
            Collect signature, photo, or code to complete delivery.
          </div>

          {/* Slide to complete */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <SlideAction
              label="Slide to complete delivery"
              onSlideComplete={handleCompleteDelivery}
              color="#22c55e"
            />
          </div>

          {/* Fallback actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowIssue(true)}
              style={{ flex: 1, padding: '10px 0', border: '1.5px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--d-ink)', cursor: 'pointer' }}
            >
              Recipient unavailable
            </button>
            <button
              onClick={() => setShowIssue(true)}
              style={{ flex: 1, padding: '10px 0', border: '1.5px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--d-muted)', cursor: 'pointer' }}
            >
              Need help?
            </button>
          </div>
        </>
      )
    }

    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#e5e5e5', overflow: 'hidden' }}>

      {/* ── Google Maps iframe (full screen background) ────────────────────── */}
      <iframe
        src={googleMapsEmbedUrl(mapAddress)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          border: 'none', zIndex: 0,
        }}
        loading="lazy"
        title="Map"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* ── Back button ───────────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 60,
          width: 40, height: 40, borderRadius: '50%',
          background: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ‹
      </button>

      {/* ── Chat / message button ─────────────────────────────────────────── */}
      <button
        onClick={() => setChatOpen(true)}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 60,
          width: 40, height: 40, borderRadius: '50%',
          background: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        💬
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: '50%', background: 'var(--d-accent)',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unreadCount}
          </div>
        )}
      </button>

      {/* ── Navigation banner ────────────────────────────────────────────────── */}
      {showBanner && navInstruction && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 55, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <NavigationBanner
            instruction={navInstruction}
            onDismiss={() => setShowBanner(false)}
          />
        </div>
      )}

      {/* ── Bottom sheet ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '65vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 72px))',
          transition: 'transform 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* Handle + toggle */}
        <div
          onClick={() => setSheetOpen(v => !v)}
          style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, background: '#e0e0e0', borderRadius: 2 }} />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', scrollbarWidth: 'none' }}>
          {renderSheetContent()}
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      {showIssue && (
        <ReportIssueSheet order={order} onClose={() => setShowIssue(false)} onSubmit={handleIssueSubmit} />
      )}
      {chatOpen && (
        <ChatPanel order={order} myId={myId} onClose={() => setChatOpen(false)} />
      )}
    </div>
  )
}
