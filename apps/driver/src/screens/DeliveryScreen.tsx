import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDriver } from '../store/DriverContext'
import { driverPayout } from '../utils/payout'
import type { DeliverySubstep } from '../store/DriverContext'
import { Toast } from '../components/Toast'
import { SlideAction } from '../components/SlideAction'
import { NavigationBanner } from '../components/NavigationBanner'
import { PhotoCapture } from '../components/PhotoCapture'
import { checkProximity, formatDistance } from '../utils/proximity'
import type { Order } from '@shared/types'
import { addIncident, newIncidentId } from '@shared/utils/incidentStore'
import { pushNotification } from '@shared/utils/notificationStore'
import {
  getMessages, sendMessage, subscribeToMessages, markMessagesRead,
  type Message,
} from '@shared/utils/messageStore'
import { fmtTime } from '@shared/utils/format'

interface Props {
  orderId:          string
  onBack:           () => void
  onComplete:       (orderId: string) => void
  initialChatOpen?: boolean
}

const SIZE_LABEL: Record<string, string> = { s: 'Small  · ~5 lb max', m: 'Medium · ~10 lb max', l: 'Large · ~25 lb max' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function googleMapsEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=m&z=15&output=embed&iwloc=near`
}

function openMapsNav(address: string) {
  window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}&dirflg=d`, '_blank')
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}


// ── Step logic ────────────────────────────────────────────────────────────────

type FlowStep = 'en_route_pickup' | 'at_pickup' | 'en_route_dropoff'

function resolveStep(order: Order, substep: DeliverySubstep | undefined): FlowStep {
  if (substep === 'at_pickup')                                            return 'at_pickup'
  if (substep === 'picked_up' || order.status === 'in_transit')          return 'en_route_dropoff'
  return 'en_route_pickup'
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ padding: 8, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: '#e0e0e0', borderRadius: 2 }} />
        </div>
        <div style={{ padding: '4px 20px 16px', fontSize: 18, fontWeight: 700, color: 'var(--d-ink)' }}>
          Report an Issue
        </div>
        <div style={{ padding: '0 4px 4px 20px', fontSize: 13, color: 'var(--d-muted)', marginBottom: 8 }}>
          {order.id} · {order.pickup.name} → {order.dropoff.name}
        </div>
        <div style={{ padding: '0 16px' }}>
          {ISSUE_TYPES.map(type => (
            <button key={type} onClick={() => setSelected(type)} style={{
              width: '100%', padding: '12px 14px', marginBottom: 6,
              background: selected === type ? 'rgba(201,74,27,0.06)' : '#f8f9fb',
              border: `1.5px solid ${selected === type ? 'var(--d-accent)' : '#e8ebf0'}`,
              borderRadius: 10, textAlign: 'left', cursor: 'pointer',
              fontSize: 14, fontWeight: selected === type ? 600 : 400,
              color: selected === type ? 'var(--d-accent)' : 'var(--d-ink)',
            }}>{type}</button>
          ))}
          <textarea
            value={detail} onChange={e => setDetail(e.target.value)}
            placeholder="Additional details (optional)…"
            style={{ marginTop: 6, minHeight: 70, width: '100%', boxSizing: 'border-box', border: '1.5px solid #e8ebf0', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingBottom: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', border: '1.5px solid #e8ebf0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>
              Cancel
            </button>
            <button disabled={!selected} onClick={() => selected && onSubmit(selected, detail)} style={{
              flex: 2, padding: '12px 0', border: 'none', borderRadius: 10,
              background: selected ? '#ef4444' : '#e8ebf0', color: selected ? '#fff' : '#aaa',
              cursor: selected ? 'pointer' : 'default', fontSize: 14, fontWeight: 700,
            }}>Submit Report</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────

const QUICK_REPLIES = ["I'm outside", 'On my way', "Can't find address", 'Running late']

interface ChatPanelProps {
  order: Order; myId: string; messages: Message[]; fetchError: string | null
  sending: boolean; inputText: string; callNotice: boolean
  onSend: (text?: string) => void; onInputChange: (text: string) => void
  onRetry: () => void; onDismissCallNotice: () => void; onClose: () => void
}

function ChatPanel({ order, myId, messages, fetchError, sending, inputText, callNotice, onSend, onInputChange, onRetry, onDismissCallNotice, onClose }: ChatPanelProps) {
  const bottomRef  = useRef<HTMLDivElement>(null)
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--d-surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))', background: 'var(--d-accent)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{order.customerId ? order.dropoff.name : order.pickup.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{order.id} · {isTerminal ? 'Delivery closed' : 'Customer'}</div>
        </div>
      </div>

      {callNotice && (
        <div style={{ padding: '10px 16px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>📵</span>
          <span style={{ flex: 1, fontSize: 13, color: '#92400e' }}><strong>Calling is not available yet.</strong> Please message the customer instead.</span>
          <button onClick={onDismissCallNotice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'none' }}>
        {fetchError ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 6 }}>Unable to load messages.</div>
            <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 12, fontFamily: 'monospace' }}>{fetchError}</div>
            <button onClick={onRetry} style={{ padding: '8px 18px', border: '1.5px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--d-muted)', fontSize: 13, marginTop: 40 }}>No messages yet.</div>
        ) : messages.map(m => {
          const isMine = m.senderId === myId
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%', padding: '9px 13px', background: isMine ? 'var(--d-accent)' : '#fff', color: isMine ? '#fff' : 'var(--d-ink)', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: 14, lineHeight: 1.45 }}>
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

      {!isTerminal && !fetchError && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 12px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, background: 'var(--d-surface)' }}>
          {QUICK_REPLIES.map(reply => (
            <button key={reply} onClick={() => onSend(reply)} disabled={sending} style={{ flexShrink: 0, padding: '6px 12px', border: '1.5px solid var(--d-accent)', borderRadius: 20, background: '#fff', color: 'var(--d-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: sending ? 0.6 : 1 }}>
              {reply}
            </button>
          ))}
        </div>
      )}

      {isTerminal ? (
        <div style={{ padding: '14px 16px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid var(--d-border)', textAlign: 'center', fontSize: 13, color: 'var(--d-muted)' }}>
          Messaging is closed for this delivery.
        </div>
      ) : (
        <div style={{ padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid var(--d-border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={inputText} onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Message customer…" rows={1}
            style={{ flex: 1, resize: 'none', border: '1.5px solid var(--d-border)', borderRadius: 20, padding: '9px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.4, background: '#f5f6f8' }}
          />
          <button onClick={() => onSend()} disabled={!inputText.trim() || sending} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: inputText.trim() && !sending ? 'var(--d-accent)' : 'var(--d-border)', color: inputText.trim() && !sending ? '#fff' : 'var(--d-muted)', fontSize: 16, cursor: inputText.trim() && !sending ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DeliveryScreen({ orderId, onBack, onComplete, initialChatOpen = false }: Props) {
  const { state, dispatch, completedOrders } = useDriver()

  const [toast,            setToast]           = useState('')
  const [showIssue,        setShowIssue]       = useState(false)
  const [chatOpen,         setChatOpen]        = useState(initialChatOpen)
  const [callNotice,       setCallNotice]      = useState(false)
  const [photoPreview,     setPhotoPreview]    = useState<string | null>(null)
  const [photoUrl,         setPhotoUrl]        = useState<string | null>(null)
  const [photoUploading,   setPhotoUploading]  = useState(false)
  const [confirming,       setConfirming]      = useState(false)
  const [sheetOpen,        setSheetOpen]       = useState(true)
  const [checkingLocation, setCheckingLocation] = useState(false)

  const [messages,   setMessages]   = useState<Message[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [inputText,  setInputText]  = useState('')
  const [sending,    setSending]    = useState(false)

  const myId  = state.auth?.driverId ?? ''
  const order = state.orders.find(o => o.id === orderId)

  const loadMessages = useCallback(async () => {
    if (!orderId) return
    try {
      const msgs = await getMessages(orderId)
      setMessages(msgs)
      setFetchError(null)
    } catch (err: any) {
      setFetchError(err?.message ?? 'Failed to load messages')
    }
  }, [orderId])

  useEffect(() => {
    loadMessages()
    const unsub = subscribeToMessages(orderId, setMessages)
    return unsub
  }, [orderId])

  useEffect(() => {
    if (chatOpen && myId && messages.length > 0) {
      markMessagesRead(orderId, myId).catch(() => {})
    }
  }, [chatOpen, orderId, myId, messages.length])

  const prevUnreadRef = useRef(0)
  useEffect(() => {
    if (chatOpen) { prevUnreadRef.current = 0; return }
    const count = messages.filter(m => m.receiverId === myId && !m.isRead).length
    if (count > prevUnreadRef.current) {
      const latest = [...messages].reverse().find(m => m.receiverId === myId && !m.isRead)
      if (latest) {
        setToast(`💬 "${latest.messageText.slice(0, 40)}${latest.messageText.length > 40 ? '…' : ''}"`)
        setTimeout(() => setToast(''), 4000)
      }
    }
    prevUnreadRef.current = count
  }, [messages, chatOpen, myId])

  const unreadCount = messages.filter(m => m.receiverId === myId && !m.isRead).length

  if (!order) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--d-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--d-ink)', marginBottom: 6 }}>Loading order…</div>
        <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 24 }}>{orderId}</div>
        <button onClick={onBack} style={{ padding: '10px 24px', background: 'var(--d-accent)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to Dashboard</button>
      </div>
    )
  }

  const substep  = state.substeps[order.id]
  const step     = resolveStep(order, substep)
  const mapAddr  = step === 'en_route_pickup' ? order.pickup.address : order.dropoff.address
  const payout   = `$${driverPayout(order).toFixed(2)}`

  const navInstruction = step === 'en_route_pickup'
    ? `Head to ${order.pickup.address.split(',')[0]}`
    : `Head to ${order.dropoff.address.split(',')[0]}`

  const todayCompleted = completedOrders.filter(o => {
    const d = new Date(o.updatedAt)
    return d.toDateString() === new Date().toDateString()
  })
  const earningsToday = todayCompleted.reduce((sum, o) => sum + driverPayout(o), 0)
  const todayJobs = todayCompleted.length

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim()
    const customerId = order.customerId
    if (!msg || !customerId || !myId) return
    if (order.status === 'delivered' || order.status === 'cancelled') return
    setSending(true)
    if (!text) setInputText('')
    try {
      await sendMessage({ orderId: order.id, senderId: myId, senderRole: 'driver', receiverId: customerId, receiverRole: 'customer', messageText: msg })
      await loadMessages()
    } catch {
      setToast('Failed to send message.')
      setTimeout(() => setToast(''), 3000)
    }
    setSending(false)
  }, [inputText, order.id, order.customerId, order.status, myId, loadMessages])

  const handleArrivedPickup = useCallback(async () => {
    setCheckingLocation(true)
    const result = await checkProximity(order.pickup)
    setCheckingLocation(false)

    if (result.status === 'too_far') {
      setToast(`You're ${formatDistance(result.distanceMeters)} from the pickup. Get closer to continue.`)
      setTimeout(() => setToast(''), 4000)
      return
    }
    if (result.status === 'location_denied') {
      setToast('Location access is off. Enable it in Settings to verify arrival.')
      setTimeout(() => setToast(''), 4000)
      return
    }

    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_pickup' })
    setToast('Arrived at pickup! Confirm the parcel.')
    setTimeout(() => setToast(''), 2000)
  }, [dispatch, orderId, order.pickup])

  const handleConfirmPickup = useCallback(async () => {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 400))
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'picked_up' })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'picked_up' })
    // Attach pickup photo URL to the order notes so admin + customer can see it
    if (photoUrl || photoPreview) {
      dispatch({
        type: 'ADD_NOTE', orderId,
        note: {
          id: `pickup-photo-${Date.now()}`,
          text: `📷 Pickup photo: ${photoUrl ?? photoPreview}`,
          authorName: state.auth?.name ?? 'Driver',
          createdAt: new Date().toISOString(),
        },
      })
    }
    // banner always visible
    setConfirming(false)
    setToast('Parcel confirmed! Heading to drop-off.')
    setTimeout(() => setToast(''), 2200)
  }, [dispatch, orderId, photoUrl, photoPreview, state.auth?.name])

  const handleArrivedDropoff = useCallback(async () => {
    setCheckingLocation(true)
    const result = await checkProximity(order.dropoff)
    setCheckingLocation(false)

    if (result.status === 'too_far') {
      setToast(`You're ${formatDistance(result.distanceMeters)} from the drop-off. Get closer to continue.`)
      setTimeout(() => setToast(''), 4000)
      return
    }
    if (result.status === 'location_denied') {
      setToast('Location access is off. Enable it in Settings to verify arrival.')
      setTimeout(() => setToast(''), 4000)
      return
    }

    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'in_transit' })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_dropoff' })
    onComplete(orderId)
  }, [dispatch, orderId, order.dropoff, onComplete])

  const handleIssueSubmit = useCallback(async (issueType: string, detail: string) => {
    setShowIssue(false)
    const note = { id: `note-${Date.now()}`, text: `⚠️ Issue: ${issueType}${detail ? ' — ' + detail : ''}`, authorName: state.auth?.name ?? 'Driver', createdAt: new Date().toISOString() }
    dispatch({ type: 'ADD_NOTE', orderId, note })
    await addIncident({ id: newIncidentId(), orderId, source: 'driver', reporterId: myId, reporterName: state.auth?.name ?? 'Driver', category: issueType, description: detail, severity: 'medium', status: 'new', assignedTo: undefined, notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    await pushNotification({ event: 'issue_reported', audience: 'admin', orderId, title: 'Issue Reported', body: `Driver reported: ${issueType}`, driverId: myId })
    setToast('Issue reported to admin.')
    setTimeout(() => setToast(''), 2500)
  }, [dispatch, myId, orderId, state.auth?.name])

  // ── AT PICKUP: full-screen view (no map) ──────────────────────────────────

  if (step === 'at_pickup') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--d-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Dark header */}
        <div style={{ background: '#111827', paddingTop: 'max(52px, env(safe-area-inset-top, 52px))', paddingBottom: 16, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', borderRadius: 99, padding: '4px 10px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.6 }}>ONLINE</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>TODAY</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${earningsToday.toFixed(2)} · {todayJobs} Jobs</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ padding: '20px 20px 0' }}>

            {/* Tag */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,74,27,0.1)', color: 'var(--d-accent)', padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--d-accent)' }} />
              AT PICKUP
            </div>

            {/* Heading */}
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--d-ink)', letterSpacing: -0.5, marginBottom: 6 }}>
              Confirm the parcel.
            </div>
            <div style={{ fontSize: 14, color: 'var(--d-muted)', lineHeight: 1.5, marginBottom: 20 }}>
              Match the description, snap a photo for the sender's records, then slide to confirm pickup.
            </div>

            {/* Contact card */}
            <div style={{ background: '#fff', border: '1px solid var(--d-border)', borderRadius: 12, padding: '14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {initials(order.pickup.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--d-ink)' }}>{order.pickup.name}</div>
                <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 1 }}>
                  {order.pickup.address.split(',')[0]}{order.pickup.unit ? ` · ${order.pickup.unit}` : ''}
                </div>
              </div>
              <button
                onClick={() => order.pickup.phone ? window.open(`tel:${order.pickup.phone.replace(/\s/g, '')}`) : undefined}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--d-border)', background: 'var(--d-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--d-ink)" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3c0 0 1 0 2 2s.5 3.5 2 5 3 3 5 3"/></svg>
              </button>
            </div>

            {/* Parcel details table */}
            <div style={{ background: '#fff', border: '1px solid var(--d-border)', borderRadius: 12, padding: '4px 0', marginBottom: 14, overflow: 'hidden' }}>
              {[
                { label: 'SIZE',        value: SIZE_LABEL[order.parcel.size] ?? order.parcel.size },
                { label: 'DESCRIPTION', value: order.parcel.desc },
                ...(order.parcel.fragile ? [{ label: 'HANDLING', value: 'Fragile · keep upright' }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', padding: '12px 14px', borderTop: i > 0 ? '1px solid var(--d-border)' : 'none' }}>
                  <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, paddingTop: 1 }}>{row.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--d-ink)' }}>{row.value}</div>
                </div>
              ))}
            </div>

            {/* Admin notes */}
            {order.notes.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
                {order.notes.map(n => n.text).join(' · ')}
              </div>
            )}

            {/* Photo proof */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Photo Proof
              </div>
              <PhotoCapture
                orderId={orderId}
                label="pickup"
                required
                captured={!!photoPreview}
                previewUrl={photoPreview}
                uploading={photoUploading}
                onCapture={(preview, storage) => {
                  setPhotoPreview(preview)
                  setPhotoUploading(storage === null && preview !== null)
                  if (storage !== null) { setPhotoUrl(storage); setPhotoUploading(false) }
                }}
                onClear={() => { setPhotoPreview(null); setPhotoUrl(null) }}
              />
            </div>

          </div>
        </div>

        {/* Bottom action */}
        <div style={{ padding: '12px 20px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', background: '#fff', borderTop: '1px solid var(--d-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SlideAction
            label={confirming ? 'Confirming…' : 'Slide to confirm pickup'}
            variant="green"
            onSlideComplete={handleConfirmPickup}
            disabled={confirming}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowIssue(true)} style={{ flex: 1, padding: '11px 0', border: '1px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 500, color: 'var(--d-ink)', cursor: 'pointer' }}>
              Wrong parcel?
            </button>
            <button onClick={() => {
              if (window.confirm('Cancel this job? This action cannot be undone.')) {
                dispatch({ type: 'UPDATE_STATUS', orderId, status: 'cancelled' })
                onBack()
              }
            }} style={{ flex: 1, padding: '11px 0', border: '1px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}>
              Cancel job
            </button>
          </div>
        </div>

        {toast    && <Toast message={toast} onDone={() => setToast('')} />}
        {showIssue && <ReportIssueSheet order={order} onClose={() => setShowIssue(false)} onSubmit={handleIssueSubmit} />}
        {chatOpen && (
          <ChatPanel order={order} myId={myId} messages={messages} fetchError={fetchError} sending={sending} inputText={inputText} callNotice={callNotice} onSend={handleSend} onInputChange={setInputText} onRetry={loadMessages} onDismissCallNotice={() => setCallNotice(false)} onClose={() => { setChatOpen(false); setCallNotice(false) }} />
        )}
      </div>
    )
  }

  // ── Map-first view (en-route steps) ──────────────────────────────────────

  const isPickup = step === 'en_route_pickup'
  const party    = isPickup ? order.pickup : order.dropoff
  const tagLabel = isPickup ? `PICKUP · ${order.id}` : `DROP-OFF · ${order.id}`
  const neighborhood = party.address.split(',').slice(1).join(',').trim()
  const subtitle = `${neighborhood ? neighborhood + ' · ' : ''}${party.name}`

  const sheetContent = (
    <>
      {/* Tag */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10,
        background: isPickup ? 'rgba(201,74,27,0.1)' : 'rgba(17,24,39,0.08)',
        color: isPickup ? 'var(--d-accent)' : 'var(--d-ink)',
        padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isPickup ? 'var(--d-accent)' : 'var(--d-ink)' }} />
        {tagLabel}
      </div>

      {/* Address + subtitle */}
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 2, letterSpacing: -0.3 }}>
        {party.address.split(',')[0]}
        {!isPickup && order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}
      </div>
      <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 14 }}>{subtitle}</div>

      {/* Sender note (drop-off only) */}
      {!isPickup && order.dropoff.note && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>Note from sender</div>
          <div style={{ fontSize: 13, color: '#1e3a5f' }}>{order.dropoff.note}</div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'ETA',      value: `~${Math.round(order.distanceKm * 3 + 5)} min` },
          { label: 'Distance', value: `${order.distanceKm} km`     },
          { label: 'Payout',   value: payout, accent: true          },
        ].map(s => (
          <div key={s.label} style={{ padding: 10, background: '#f9fafb', borderRadius: 10 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--d-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: (s as any).accent ? 'var(--d-accent)' : 'var(--d-ink)', marginTop: 2, letterSpacing: -0.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Navigation helper */}
      <button onClick={() => openMapsNav(party.address)} style={{ width: '100%', padding: '10px', border: '1px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 500, color: 'var(--d-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1l5.5 11.5L7 10.5 1.5 12.5z"/></svg>
        Open in Maps
      </button>

      {/* Slide action */}
      <SlideAction
        label={checkingLocation ? 'Checking location…' : "Slide when you've arrived"}
        variant="dark"
        disabled={checkingLocation}
        onSlideComplete={isPickup ? handleArrivedPickup : handleArrivedDropoff}
      />
    </>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#e5e5e5', overflow: 'hidden' }}>

      {/* Map */}
      <iframe
        src={googleMapsEmbedUrl(mapAddr)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 0 }}
        loading="lazy" title="Map" referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Back */}
      <button onClick={onBack} style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top, 16px))', left: 16, zIndex: 60, width: 40, height: 40, borderRadius: '50%', background: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--d-ink)" strokeWidth="2.2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
      </button>


      {/* Navigation banner */}
      {navInstruction && (
        <NavigationBanner instruction={navInstruction} distanceCue={`${order.distanceKm.toFixed(1)} km`} />
      )}

      {/* Right-rail glass buttons (phone + message) */}
      <div style={{
        position: 'absolute', top: 130, right: 12, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <button
          onClick={() => {
            const phone = isPickup ? order.pickup.phone : order.dropoff.phone
            if (phone) window.open(`tel:${phone.replace(/\s/g, '')}`)
          }}
          style={{
            width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(11,18,32,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3c0 0 1 0 2 2s.5 3.5 2 5 3 3 5 3"/>
          </svg>
        </button>
        <button
          onClick={() => setChatOpen(true)}
          style={{
            width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(11,18,32,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2v3l4-3h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
          </svg>
          {unreadCount > 0 && (
            <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#c94a1b', border: '2px solid #fff', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        background: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
        transform: sheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 64px))',
        transition: 'transform 0.28s ease-out',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        maxHeight: '58vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div onClick={() => setSheetOpen(v => !v)} style={{ padding: '10px 20px 6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px', scrollbarWidth: 'none' }}>
          {sheetContent}
        </div>
      </div>

      {toast     && <Toast message={toast} onDone={() => setToast('')} />}
      {showIssue && <ReportIssueSheet order={order} onClose={() => setShowIssue(false)} onSubmit={handleIssueSubmit} />}
      {chatOpen  && (
        <ChatPanel order={order} myId={myId} messages={messages} fetchError={fetchError} sending={sending} inputText={inputText} callNotice={callNotice} onSend={handleSend} onInputChange={setInputText} onRetry={loadMessages} onDismissCallNotice={() => setCallNotice(false)} onClose={() => { setChatOpen(false); setCallNotice(false) }} />
      )}
    </div>
  )
}
