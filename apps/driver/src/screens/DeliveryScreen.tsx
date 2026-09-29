import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDriver, isAcceptedJob } from '../store/DriverContext'
import { driverPayout } from '../utils/payout'
import type { DeliverySubstep } from '../store/DriverContext'
import { Toast } from '../components/Toast'
import { SlideAction } from '../components/SlideAction'
import { PhotoCapture } from '../components/PhotoCapture'
import { DeliveryMap, type DeliveryMapHandle } from '../components/DeliveryMap'
import { checkProximity, formatDistance, geocodeAddress, type ProximityResult } from '../utils/proximity'
import { subscribePosition, type Fix } from '../lib/locationBroadcast'
import { useDrivingRoute } from '../lib/route'
import { NAV_APPS, getNavApp, setNavApp, openNavigation, type NavApp } from '../lib/navigation'
import { haptic } from '../lib/haptics'
import { BackButton, Button, Icon, ScreenHeader, type IconName } from '../ui'
import { Capacitor } from '@capacitor/core'
import { DELIVERY_WINDOW_LABELS } from '@shared/types'
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
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--d-surface)', borderRadius: '20px 20px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ padding: 8, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: 'var(--d-border)', borderRadius: 2 }} />
        </div>
        <div style={{ padding: '4px 20px 16px', fontSize: 20, fontWeight: 650, letterSpacing: -0.4, color: 'var(--d-ink)' }}>
          Report a problem
        </div>
        <div style={{ padding: '0 4px 4px 20px', fontSize: 13, color: 'var(--d-muted)', marginBottom: 8 }}>
          {order.id} · {order.pickup.name} → {order.dropoff.name}
        </div>
        <div style={{ padding: '0 16px' }}>
          {ISSUE_TYPES.map(type => (
            <button key={type} onClick={() => setSelected(type)} style={{
              width: '100%', padding: '12px 14px', marginBottom: 6,
              background: selected === type ? 'var(--d-accent-lt)' : 'var(--d-surface-2)',
              border: `1.5px solid ${selected === type ? 'var(--d-accent)' : 'var(--d-border)'}`,
              borderRadius: 10, textAlign: 'left', cursor: 'pointer',
              fontSize: 14, fontWeight: selected === type ? 600 : 400,
              color: selected === type ? 'var(--d-accent)' : 'var(--d-ink)',
            }}>{type}</button>
          ))}
          <textarea
            value={detail} onChange={e => setDetail(e.target.value)}
            placeholder="Additional details (optional)…"
            style={{ marginTop: 6, minHeight: 70, width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--d-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: 'var(--d-surface-2)', color: 'var(--d-ink)' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingBottom: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', border: '1.5px solid var(--d-border)', borderRadius: 10, background: 'var(--d-surface)', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>
              Cancel
            </button>
            <button disabled={!selected} onClick={() => selected && onSubmit(selected, detail)} style={{
              flex: 2, padding: '12px 0', border: 'none', borderRadius: 10,
              background: selected ? 'var(--d-err)' : 'var(--d-surface-2)', color: selected ? '#fff' : 'var(--d-muted-lt)',
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 150, background: 'var(--d-surface)', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader
        title={order.customerName || 'Customer'}
        subtitle={`${order.id} · ${isTerminal ? 'Delivery closed' : 'Messages'}`}
        onBack={onClose}
      />

      {callNotice && (
        <div style={{ padding: '10px 16px', background: 'var(--d-warn-bg)', borderBottom: '1px solid var(--d-warn-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--d-warn)' }}><strong>Calling is not available yet.</strong> Please message the customer instead.</span>
          <button onClick={onDismissCallNotice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--d-warn)', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'none' }}>
        {fetchError ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--d-err)', fontWeight: 600, marginBottom: 6 }}>Unable to load messages.</div>
            <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 12, fontFamily: 'monospace' }}>{fetchError}</div>
            <button onClick={onRetry} style={{ padding: '8px 18px', border: '1.5px solid var(--d-border)', borderRadius: 10, background: 'var(--d-surface)', fontSize: 13, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--d-muted)', fontSize: 13, marginTop: 40 }}>No messages yet.</div>
        ) : messages.map(m => {
          const isMine = m.senderId === myId
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%', padding: '9px 13px', background: isMine ? 'var(--d-accent)' : 'var(--d-surface)', color: isMine ? '#fff' : 'var(--d-ink)', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: 14, lineHeight: 1.45 }}>
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
            <button key={reply} onClick={() => onSend(reply)} disabled={sending} style={{ flexShrink: 0, padding: '6px 12px', border: '1.5px solid var(--d-accent)', borderRadius: 20, background: 'var(--d-surface)', color: 'var(--d-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: sending ? 0.6 : 1 }}>
              {reply}
            </button>
          ))}
        </div>
      )}

      {isTerminal ? (
        <div style={{ padding: '14px 16px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', background: 'var(--d-surface)', borderTop: '1px solid var(--d-border)', textAlign: 'center', fontSize: 13, color: 'var(--d-muted)' }}>
          Messaging is closed for this delivery.
        </div>
      ) : (
        <div style={{ padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--d-surface)', borderTop: '1px solid var(--d-border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={inputText} onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Message customer…" rows={1}
            style={{ flex: 1, resize: 'none', border: '1.5px solid var(--d-border)', borderRadius: 20, padding: '9px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.4, background: 'var(--d-surface-2)', color: 'var(--d-ink)' }}
          />
          <button onClick={() => onSend()} disabled={!inputText.trim() || sending} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: inputText.trim() && !sending ? 'var(--d-accent)' : 'var(--d-border)', color: inputText.trim() && !sending ? '#fff' : 'var(--d-muted)', fontSize: 16, cursor: inputText.trim() && !sending ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        </div>
      )}
    </div>
  )
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function Stepper({ step }: { step: FlowStep }) {
  const onDropoffLeg = step === 'en_route_dropoff'
  const dot = (state: 'done' | 'active' | 'todo') => ({
    width: 10, height: 10, borderRadius: 5, flexShrink: 0,
    background: state === 'todo' ? 'transparent' : state === 'done' ? 'var(--d-ok)' : 'var(--d-accent)',
    border: state === 'todo' ? '2px solid var(--d-border)' : 'none',
  } as React.CSSProperties)
  const label = (active: boolean) => ({
    fontSize: 12, fontWeight: active ? 650 : 500, color: active ? 'var(--d-ink)' : 'var(--d-muted)',
  } as React.CSSProperties)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label={onDropoffLeg ? 'Step 2 of 2' : 'Step 1 of 2'}>
      <span style={dot(onDropoffLeg ? 'done' : 'active')} />
      <span style={label(!onDropoffLeg)}>Pickup</span>
      <span style={{ flex: 1, height: 2, borderRadius: 1, background: onDropoffLeg ? 'var(--d-ok)' : 'var(--d-border)', maxWidth: 56 }} />
      <span style={dot(onDropoffLeg ? 'active' : 'todo')} />
      <span style={label(onDropoffLeg)}>Drop-off</span>
    </div>
  )
}

function ActionTile({ icon, label, onClick, badge, tone }: {
  icon: IconName; label: string; onClick: () => void; badge?: number; tone?: 'danger'
}) {
  return (
    <button className="d-press" onClick={() => { haptic('tap'); onClick() }} style={{
      flex: 1, height: 64, borderRadius: 16, cursor: 'pointer', position: 'relative',
      background: 'var(--d-surface-2)', border: '1px solid var(--d-border)',
      color: tone === 'danger' ? 'var(--d-err)' : 'var(--d-ink)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
    }}>
      <Icon name={icon} size={19} />
      {label}
      {!!badge && (
        <span style={{
          position: 'absolute', top: 8, right: 'calc(50% - 22px)', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
          background: 'var(--d-accent)', color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

function NoteCard({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14,
      background: 'var(--d-info-bg)', color: 'var(--d-ink)',
    }}>
      <span style={{ color: 'var(--d-info)', paddingTop: 1 }}><Icon name="note" size={17} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: 'var(--d-info)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  )
}

/** Inline explanation when the arrival check fails — replaces a fleeting toast. */
function ArrivalProblem({ result, place, onRetry, onDismiss }: {
  result: ProximityResult; place: string; onRetry: () => void; onDismiss: () => void
}) {
  if (result.status === 'ok') return null
  const copy = {
    too_far:         { title: `You're ${result.status === 'too_far' ? formatDistance(result.distanceMeters) : ''} from the ${place}`, body: 'Get within 300 m, then slide again.' },
    location_denied: { title: 'Location is turned off', body: 'CitySend Driver needs your location to confirm you\'ve arrived.' },
    location_error:  { title: "Couldn't get your location", body: 'Check you have GPS signal, then try again.' },
    geocode_failed:  { title: `We couldn't find the ${place} on the map`, body: 'Try again, or call the customer or report a problem.' },
  }[result.status]
  const canOpenSettings = result.status === 'location_denied' && Capacitor.isNativePlatform()
  return (
    <div role="alert" style={{
      padding: '14px 16px', borderRadius: 16, background: 'var(--d-warn-bg)', border: '1px solid var(--d-warn-border)',
    }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ color: 'var(--d-warn)', paddingTop: 1 }}><Icon name="alert" size={18} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}>{copy.title}</div>
          <div style={{ fontSize: 13, color: 'var(--d-ink-2)', marginTop: 2, lineHeight: 1.45 }}>{copy.body}</div>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--d-muted)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0, height: 20 }}>×</button>
      </div>
      {(canOpenSettings || result.status === 'location_error' || result.status === 'geocode_failed') && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {canOpenSettings
            ? <Button size="md" variant="secondary" onClick={() => {
                import('@capgo/background-geolocation').then(({ BackgroundGeolocation }) => BackgroundGeolocation.openSettings()).catch(() => {})
              }}>Open Settings</Button>
            : <Button size="md" variant="secondary" onClick={onRetry}>Try again</Button>}
        </div>
      )}
    </div>
  )
}

function NavChooser({ onPick, onClose }: { onPick: (app: NavApp, remember: boolean) => void; onClose: () => void }) {
  const [remember, setRemember] = useState(true)
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 220, background: 'var(--d-overlay)', display: 'flex', alignItems: 'flex-end', animation: 'd-fade-in .18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--d-surface)', borderRadius: '24px 24px 0 0',
        padding: '20px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', animation: 'd-slide-up .22s ease',
      }}>
        <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4, color: 'var(--d-ink)', margin: '0 4px 14px' }}>Navigate with</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NAV_APPS.map(a => (
            <Button key={a.id} variant="secondary" onClick={() => onPick(a.id, remember)}>{a.label}</Button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 4px 4px', fontSize: 14, color: 'var(--d-ink-2)' }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--d-accent)' }} />
          Always use this app
        </label>
      </div>
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function DeliveryScreen(props: Props) {
  const { state } = useDriver()
  const order = state.orders.find(o => o.id === props.orderId)

  // Order not in state yet (first load) — separate component so the flow's
  // hooks always run in the same order.
  if (!order) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--d-bg)', display: 'flex', flexDirection: 'column' }}>
        <ScreenHeader title="Loading job…" subtitle={props.orderId} onBack={props.onBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--d-muted)', fontSize: 14 }}>
          Fetching the latest details
        </div>
      </div>
    )
  }
  // Not accepted yet (offered, or pre-assigned for a later window): no
  // navigation until the driver has said yes to the job.
  if (!isAcceptedJob(order) && order.status !== 'delivered' && order.status !== 'cancelled') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--d-bg)', color: 'var(--d-ink)', display: 'flex', flexDirection: 'column' }}>
        <ScreenHeader title="Not started yet" subtitle={order.id} onBack={props.onBack} />
        <div style={{ padding: '8px 20px', fontSize: 15, color: 'var(--d-muted)', lineHeight: 1.5 }}>
          {order.status === 'offered'
            ? 'Accept this job from the offer on your dashboard before heading to the pickup.'
            : "This job hasn't been dispatched yet. You'll get an offer when it's ready."}
        </div>
      </div>
    )
  }
  return <DeliveryFlow {...props} order={order} />
}

function DeliveryFlow({ order, onBack, onComplete, initialChatOpen = false }: Props & { order: Order }) {
  const { state, dispatch } = useDriver()
  const orderId = order.id

  const [toast,            setToast]           = useState('')
  const [showIssue,        setShowIssue]       = useState(false)
  const [chatOpen,         setChatOpen]        = useState(initialChatOpen)
  const [callNotice,       setCallNotice]      = useState(false)
  const [photoPreview,     setPhotoPreview]    = useState<string | null>(null)
  const [photoUrl,         setPhotoUrl]        = useState<string | null>(null)
  const [photoUploading,   setPhotoUploading]  = useState(false)
  const [confirming,       setConfirming]      = useState(false)
  const [checkingLocation, setCheckingLocation] = useState(false)
  const [arrivalProblem,   setArrivalProblem]  = useState<ProximityResult | null>(null)
  const [navChooser,       setNavChooser]      = useState(false)

  const [messages,   setMessages]   = useState<Message[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [inputText,  setInputText]  = useState('')
  const [sending,    setSending]    = useState(false)

  const myId = state.auth?.driverId ?? ''

  // Watchdog: if admin unassigns this order from the driver mid-delivery
  // (assignment cleared or reassigned, or order cancelled), bail back to the
  // dashboard. Without this, the driver keeps swiping through stale screens.
  const removedRef = useRef(false)
  useEffect(() => {
    if (!myId || removedRef.current) return
    const taken = order.assignedDriverId !== myId
    const cancelled = order.status === 'cancelled'
    if (taken || cancelled) {
      removedRef.current = true
      setToast(cancelled ? 'This order was cancelled.' : 'This order was removed from your queue.')
      // Brief delay so the toast is visible before we navigate away.
      setTimeout(() => onBack(), 1500)
    }
  }, [order.assignedDriverId, order.status, myId, onBack])

  const loadMessages = useCallback(async () => {
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
        haptic('tap')
        setToast(`New message: "${latest.messageText.slice(0, 40)}${latest.messageText.length > 40 ? '…' : ''}"`)
      }
    }
    prevUnreadRef.current = count
  }, [messages, chatOpen, myId])

  const unreadCount = messages.filter(m => m.receiverId === myId && !m.isRead).length

  const substep  = state.substeps[orderId]
  const step     = resolveStep(order, substep)
  const isPickup = step !== 'en_route_dropoff'
  const party    = isPickup ? order.pickup : order.dropoff
  const place    = isPickup ? 'pickup' : 'drop-off'

  // ── Live map data ─────────────────────────────────────────────────────────

  const [driverPos, setDriverPos] = useState<Fix | null>(null)
  useEffect(() => subscribePosition(setDriverPos), [])

  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    setTarget(null)
    if (party.lat != null && party.lng != null) { setTarget({ lat: party.lat, lng: party.lng }); return }
    let cancelled = false
    geocodeAddress(party.address, order.cityId).then(p => { if (!cancelled && p) setTarget(p) })
    return () => { cancelled = true }
  }, [party.address, party.lat, party.lng, order.cityId])

  const route = useDrivingRoute(driverPos, target)
  const mapRef = useRef<DeliveryMapHandle>(null)

  const sheetRef = useRef<HTMLDivElement>(null)
  const [sheetH, setSheetH] = useState(360)
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSheetH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [step])

  useEffect(() => { setArrivalProblem(null) }, [step])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim()
    const customerId = order.customerId
    if (!msg || !customerId || !myId) return
    if (order.status === 'delivered' || order.status === 'cancelled') return
    setSending(true)
    if (!text) setInputText('')
    try {
      await sendMessage({ orderId, senderId: myId, senderRole: 'driver', receiverId: customerId, receiverRole: 'customer', messageText: msg })
      await loadMessages()
    } catch {
      setToast('Message not sent. Try again.')
    }
    setSending(false)
  }, [inputText, orderId, order.customerId, order.status, myId, loadMessages])

  const handleArrived = useCallback(async () => {
    setArrivalProblem(null)
    setCheckingLocation(true)
    const result = await checkProximity(party, order.cityId)
    setCheckingLocation(false)

    if (result.status !== 'ok') {
      haptic('warning')
      setArrivalProblem(result)
      return
    }

    haptic('success')
    if (isPickup) {
      dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_pickup' })
    } else {
      dispatch({ type: 'UPDATE_STATUS', orderId, status: 'in_transit' })
      dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'at_dropoff' })
      onComplete(orderId)
    }
  }, [dispatch, orderId, party, isPickup, onComplete, order.cityId])

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
    setConfirming(false)
    haptic('success')
    setToast('Parcel picked up. Head to the drop-off.')
  }, [dispatch, orderId, photoUrl, photoPreview, state.auth?.name])

  const handleIssueSubmit = useCallback(async (issueType: string, detail: string) => {
    setShowIssue(false)
    const note = { id: `note-${Date.now()}`, text: `⚠️ Issue: ${issueType}${detail ? ' — ' + detail : ''}`, authorName: state.auth?.name ?? 'Driver', createdAt: new Date().toISOString() }
    dispatch({ type: 'ADD_NOTE', orderId, note })
    await addIncident({ id: newIncidentId(), orderId, source: 'driver', reporterId: myId, reporterName: state.auth?.name ?? 'Driver', category: issueType, description: detail, severity: 'medium', status: 'new', assignedTo: undefined, notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    await pushNotification({ event: 'issue_reported', audience: 'admin', orderId, title: 'Issue Reported', body: `Driver reported: ${issueType}`, driverId: myId })
    setToast('Problem reported. Dispatch will follow up.')
  }, [dispatch, myId, orderId, state.auth?.name])

  const callParty = (phone?: string) => {
    if (phone) window.open(`tel:${phone.replace(/\s/g, '')}`)
    else setToast('No phone number on this order.')
  }

  const navigate = () => {
    const dest = { address: party.address, lat: target?.lat, lng: target?.lng }
    const app = getNavApp()
    if (app) openNavigation(app, dest)
    else setNavChooser(true)
  }

  const overlays = (
    <>
      {toast     && <Toast message={toast} duration={3500} onDone={() => setToast('')} />}
      {showIssue && <ReportIssueSheet order={order} onClose={() => setShowIssue(false)} onSubmit={handleIssueSubmit} />}
      {navChooser && (
        <NavChooser
          onClose={() => setNavChooser(false)}
          onPick={(app, remember) => {
            if (remember) setNavApp(app)
            setNavChooser(false)
            openNavigation(app, { address: party.address, lat: target?.lat, lng: target?.lng })
          }}
        />
      )}
      {chatOpen && (
        <ChatPanel order={order} myId={myId} messages={messages} fetchError={fetchError} sending={sending} inputText={inputText} callNotice={callNotice} onSend={handleSend} onInputChange={setInputText} onRetry={loadMessages} onDismissCallNotice={() => setCallNotice(false)} onClose={() => { setChatOpen(false); setCallNotice(false) }} />
      )}
    </>
  )

  // ── AT PICKUP: confirm the parcel ────────────────────────────────────────

  if (step === 'at_pickup') {
    const rows = [
      { label: 'Size',     value: SIZE_LABEL[order.parcel.size] ?? order.parcel.size },
      { label: 'Contents', value: order.parcel.desc },
      ...(order.parcel.deliveryWindow ? [{ label: 'Window', value: DELIVERY_WINDOW_LABELS[order.parcel.deliveryWindow] }] : []),
    ]
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--d-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'var(--d-ink)' }}>
        <ScreenHeader title="At pickup" subtitle={order.id} onBack={onBack} />

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '0 4px' }}><Stepper step={step} /></div>

          <div style={{ padding: '0 4px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7 }}>Confirm the parcel</div>
            <div style={{ fontSize: 15, color: 'var(--d-muted)', marginTop: 4, lineHeight: 1.45 }}>
              Check it matches the details below, then slide to confirm pickup.
            </div>
          </div>

          {/* Sender */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 20, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--d-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 650, fontSize: 15, flexShrink: 0 }}>
              {initials(order.pickup.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>{order.pickup.name}</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 1 }}>
                {order.pickup.address.split(',')[0]}{order.pickup.unit ? ` · ${order.pickup.unit}` : ''}
              </div>
            </div>
            <Button size="md" variant="secondary" full={false} icon="phone" onClick={() => callParty(order.pickup.phone)}>Call</Button>
          </div>

          {/* Parcel */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 20, overflow: 'hidden' }}>
            {rows.map((row, i) => (
              <div key={row.label} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderTop: i > 0 ? '1px solid var(--d-border)' : 'none' }}>
                <div style={{ width: 84, fontSize: 13, color: 'var(--d-muted)', flexShrink: 0 }}>{row.label}</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{row.value}</div>
              </div>
            ))}
            {order.parcel.fragile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--d-warn-bg)', color: 'var(--d-warn)', fontSize: 14, fontWeight: 650 }}>
                <Icon name="alert" size={16} /> Fragile. Keep it upright.
              </div>
            )}
          </div>

          {order.pickup.note && <NoteCard label="Pickup note" text={order.pickup.note} />}
          {order.notes.length > 0 && <NoteCard label="From dispatch" text={order.notes.map(n => n.text).join(' · ')} />}

          <div>
            <div style={{ fontSize: 13, color: 'var(--d-muted)', margin: '0 4px 8px' }}>Photo of the parcel (optional)</div>
            <PhotoCapture
              orderId={orderId}
              label="pickup"
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

        <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', background: 'var(--d-surface)', borderTop: '1px solid var(--d-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SlideAction
            label={confirming ? 'Confirming…' : 'Slide to confirm pickup'}
            variant="green"
            onSlideComplete={handleConfirmPickup}
            disabled={confirming}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="md" variant="ghost" icon="alert" onClick={() => setShowIssue(true)}>Report a problem</Button>
            <Button size="md" variant="ghost" style={{ color: 'var(--d-err)' }} onClick={() => {
              if (window.confirm('Cancel this job? This can\'t be undone.')) {
                dispatch({ type: 'UPDATE_STATUS', orderId, status: 'cancelled' })
                onBack()
              }
            }}>Cancel job</Button>
          </div>
        </div>

        {overlays}
      </div>
    )
  }

  // ── EN ROUTE: map + one action ───────────────────────────────────────────

  const etaMin   = route ? Math.max(1, Math.round(route.durationS / 60)) : null
  const distKm   = route ? route.distanceM / 1000 : null
  const note     = isPickup ? order.pickup.note : order.dropoff.note
  const unit     = party.unit
  const phone    = isPickup ? order.pickup.phone : order.dropoff.phone

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--d-surface-2)', overflow: 'hidden', color: 'var(--d-ink)' }}>
      <DeliveryMap ref={mapRef} target={target ?? undefined} targetKind={isPickup ? 'pickup' : 'dropoff'} driver={driverPos} route={route?.coords} bottomInset={sheetH} />

      {/* Floating controls */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16, zIndex: 60, borderRadius: 22, boxShadow: 'var(--d-shadow-md)' }}>
        <BackButton onClick={onBack} />
      </div>
      <button
        onClick={() => { haptic('tap'); mapRef.current?.recenter() }}
        aria-label="Recenter map"
        className="d-press"
        style={{
          position: 'absolute', right: 16, bottom: sheetH + 14, zIndex: 60,
          width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
          background: 'var(--d-surface)', color: 'var(--d-ink)', boxShadow: 'var(--d-shadow-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      ><Icon name="locate" size={20} /></button>

      {/* Sheet */}
      <div ref={sheetRef} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        background: 'var(--d-surface)', borderRadius: '26px 26px 0 0',
        boxShadow: '0 -8px 30px rgba(0,0,0,.18)',
        padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)',
        maxHeight: '72vh', overflowY: 'auto', scrollbarWidth: 'none',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--d-border)', margin: '0 auto' }} />

        <div style={{ padding: '0 4px' }}><Stepper step={step} /></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 4px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>{isPickup ? 'Pick up from' : 'Deliver to'} {party.name}</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2, marginTop: 2 }}>
              {party.address.split(',')[0]}{unit ? ` · ${unit}` : ''}
            </div>
          </div>
          {etaMin != null && distKm != null ? (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{etaMin} min</div>
              <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>{distKm.toFixed(1)} km</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--d-muted)', flexShrink: 0, paddingTop: 4 }}>
              {driverPos ? 'Finding route…' : 'Locating you…'}
            </div>
          )}
        </div>

        {note && <NoteCard label={isPickup ? 'Pickup note' : 'Note from sender'} text={note} />}

        <div style={{ display: 'flex', gap: 8 }}>
          <ActionTile icon="phone"   label="Call"    onClick={() => callParty(phone)} />
          <ActionTile icon="message" label="Message" onClick={() => setChatOpen(true)} badge={unreadCount} />
          <ActionTile icon="alert"   label="Problem" onClick={() => setShowIssue(true)} />
        </div>

        <Button size="xl" icon="navigate" onClick={navigate}>Navigate to {place}</Button>

        {arrivalProblem && (
          <ArrivalProblem result={arrivalProblem} place={place} onRetry={handleArrived} onDismiss={() => setArrivalProblem(null)} />
        )}

        <SlideAction
          label={checkingLocation ? 'Checking location…' : "Slide when you've arrived"}
          disabled={checkingLocation}
          onSlideComplete={handleArrived}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--d-muted-lt)', padding: '0 4px' }}>
          <span>{order.id}</span>
          <span>You earn {`$${driverPayout(order).toFixed(2)}`}</span>
        </div>
      </div>

      {overlays}
    </div>
  )
}
