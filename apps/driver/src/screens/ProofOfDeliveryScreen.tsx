import React, { useState, useRef, useEffect } from 'react'
import { useDriver } from '../store/DriverContext'
import type { Order } from '@shared/types'
import { PhotoCapture } from '../components/PhotoCapture'
import { validateHandoffCode } from '@shared/utils/handoffCodeStore'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import { Button, Icon, ScreenHeader } from '../ui'
import { haptic } from '../lib/haptics'

interface Props {
  orderId:     string
  onBack:      () => void
  onConfirmed: () => void
  /** Called after "Recipient unavailable" flow completes. Should navigate
   *  to dashboard, NOT delivery (which would loop the driver back to the
   *  pickup step of a cancelled order). Falls back to onBack if omitted. */
  onUnavailable?: () => void
}

type CodeState = 'idle' | 'checking' | 'valid' | 'invalid' | 'rate_limited' | 'offline'

const CODE_MESSAGES: Partial<Record<CodeState, string>> = {
  invalid:      "That code doesn't match. Ask the recipient to check their CitySend text or notification.",
  rate_limited: 'Too many wrong attempts. Wait 15 minutes, or call support.',
  offline:      "Couldn't check the code. Check your connection and try again.",
}

// ── Code entry ────────────────────────────────────────────────────────────────

/**
 * Four large boxes backed by one numeric input, so the phone shows its number
 * pad and paste / one-time-code autofill work. Checked as soon as it's full.
 */
function CodeEntry({ value, onChange, state }: { value: string; onChange: (v: string) => void; state: CodeState }) {
  const input = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => { if (state === 'invalid') input.current?.focus() }, [state])

  const tone = state === 'valid' ? 'var(--d-ok)' : state === 'invalid' || state === 'rate_limited' ? 'var(--d-err)' : 'var(--d-ink)'
  return (
    <div onClick={() => input.current?.focus()} style={{ position: 'relative', display: 'flex', gap: 10, justifyContent: 'center', cursor: 'text' }}>
      <input
        ref={input}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="4-digit handoff code"
        disabled={state === 'valid' || state === 'checking'}
        style={{ position: 'absolute', inset: 0, opacity: 0, fontSize: 16 }}
      />
      {[0, 1, 2, 3].map(i => {
        const digit = value[i] ?? ''
        const isCursor = focused && i === Math.min(value.length, 3) && state !== 'valid'
        return (
          <div key={i} style={{
            width: 64, height: 76, borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--d-mono)', fontSize: 34, fontWeight: 600, color: tone,
            background: state === 'valid' ? 'var(--d-ok-bg)' : 'var(--d-surface)',
            border: `2px solid ${
              state === 'valid' ? 'var(--d-ok)'
              : state === 'invalid' ? 'var(--d-err)'
              : isCursor ? 'var(--d-accent)'
              : digit ? 'var(--d-ink-2)' : 'var(--d-border)'}`,
            transition: 'border-color .15s, background .2s',
            animation: state === 'invalid' ? 'd-shake .35s ease' : undefined,
          }}>{digit}</div>
        )
      })}
    </div>
  )
}

// ── Signature pad ─────────────────────────────────────────────────────────────

// Always dark ink on white "paper", in both themes: the PNG is uploaded as
// proof and viewed by admin on light pages, so it must not depend on the
// driver's night mode (light ink on transparent would be invisible there).
const PAPER = '#ffffff'
const INK   = '#0b1220'

function paintPaper(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.restore()
}

function SignaturePad({ canvasRef, signed, setSigned }: {
  canvasRef: React.RefObject<HTMLCanvasElement>; signed: boolean; setSigned: (v: boolean) => void
}) {
  const drawing = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  // Size the bitmap to the element × device pixel ratio so strokes are crisp.
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = c.clientWidth * dpr
    c.height = c.clientHeight * dpr
    const ctx = c.getContext('2d')
    ctx?.scale(dpr, dpr)
    paintPaper(c)
  }, [])

  const pos = (e: React.TouchEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    const p = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    return { x: p.clientX - r.left, y: p.clientY - r.top }
  }
  const start = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); drawing.current = true; last.current = pos(e) }
  const move = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    last.current = p
    if (!signed) setSigned(true)
  }
  const stop = () => { drawing.current = false }
  const clear = () => {
    if (canvasRef.current) paintPaper(canvasRef.current)
    setSigned(false)
  }

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: PAPER, border: `1.5px ${signed ? 'solid var(--d-ok)' : 'dashed var(--d-border)'}` }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 140, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
        />
        {!signed && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#5b657a', fontSize: 14 }}>
            Recipient signs here
          </div>
        )}
        {signed && (
          <button onClick={clear} style={{ position: 'absolute', top: 8, right: 8, height: 30, padding: '0 12px', borderRadius: 15, border: '1px solid #e4e7ec', background: '#f5f6f8', color: INK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ── Failed attempt sheet ──────────────────────────────────────────────────────

function UnavailableSheet({ hasPhoto, onConfirm, onClose }: { hasPhoto: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'var(--d-overlay)', display: 'flex', alignItems: 'flex-end', animation: 'd-fade-in .18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--d-surface)', borderRadius: '24px 24px 0 0', color: 'var(--d-ink)',
        padding: '22px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', animation: 'd-slide-up .22s ease',
      }}>
        <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4, margin: '0 4px' }}>Couldn't hand it off?</div>
        <div style={{ fontSize: 14, color: 'var(--d-ink-2)', lineHeight: 1.5, margin: '6px 4px 16px' }}>
          This marks the delivery as a failed attempt and flags it for dispatch to follow up. Keep the parcel with you.
        </div>
        {!hasPhoto && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--d-warn-bg)', color: 'var(--d-ink)', fontSize: 13, lineHeight: 1.45, marginBottom: 16 }}>
            <span style={{ color: 'var(--d-warn)' }}><Icon name="alert" size={17} /></span>
            Tip: a photo of the door helps show you were there. Add one under "Extra proof" first.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button variant="danger" onClick={onConfirm}>Mark as failed attempt</Button>
          <Button variant="ghost" onClick={onClose}>Go back</Button>
        </div>
      </div>
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ProofOfDeliveryScreen(props: Props) {
  const { state } = useDriver()
  const order = state.orders.find(o => o.id === props.orderId)
  if (!order) return null
  return <ProofFlow {...props} order={order} />
}

function ProofFlow({ order, onBack, onConfirmed, onUnavailable }: Props & { order: Order }) {
  const { state, dispatch } = useDriver()
  const orderId = order.id

  const [code,           setCode]           = useState('')
  const [codeState,      setCodeState]      = useState<CodeState>('idle')

  const [showExtras,     setShowExtras]     = useState(false)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [photoUrl,       setPhotoUrl]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [signed,         setSigned]         = useState(false)
  const [notes,          setNotes]          = useState('')

  const [receiverName,   setReceiverName]   = useState(order.dropoff.name ?? '')
  const [editingName,    setEditingName]    = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Check the code the moment all 4 digits are in.
  useEffect(() => {
    // Under 4 digits: keep any error visible (typing clears it in onChange).
    if (code.length < 4) { if (codeState === 'checking') setCodeState('idle'); return }
    let cancelled = false
    setCodeState('checking')
    validateHandoffCode(orderId, code)
      .then(ok => {
        if (cancelled) return
        if (ok) { setCodeState('valid'); haptic('success') }
        else    { setCodeState('invalid'); haptic('warning'); setTimeout(() => { if (!cancelled) setCode('') }, 450) }
      })
      .catch((e: Error) => {
        if (cancelled) return
        setCodeState(e.message === 'RATE_LIMITED' ? 'rate_limited' : 'offline')
        haptic('warning')
      })
    return () => { cancelled = true }
  }, [code])

  const uploadSignature = async (): Promise<string | null> => {
    const canvas = canvasRef.current
    if (!canvas) return null
    try {
      const blob = await (await fetch(canvas.toDataURL('image/png'))).blob()
      const path = `signatures/${orderId}-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('delivery-photos').upload(path, blob, { contentType: 'image/png', upsert: true })
      if (upErr) return null
      const FIVE_YEARS = 5 * 365 * 24 * 60 * 60
      const { data: signedUrl, error: signErr } = await supabase.storage.from('delivery-photos').createSignedUrl(path, FIVE_YEARS)
      if (signErr || !signedUrl?.signedUrl) return null
      return signedUrl.signedUrl
    } catch { return null }
  }

  const canComplete = codeState === 'valid' && !!receiverName.trim() && !photoUploading

  const handleComplete = async () => {
    if (!canComplete || submitting) return
    setSubmitting(true)
    const sigUrl = signed && isSupabaseConfigured ? await uploadSignature() : null
    const sigDetail   = signed ? (sigUrl ? ` Signature: ${sigUrl}` : ' Signature captured.') : ''
    const photoDetail = photoUrl ? ` Door photo: ${photoUrl}` : (photoPreview ? ' (door photo captured)' : '')
    dispatch({
      type: 'ADD_NOTE', orderId,
      note: {
        id: `pod-${Date.now()}`,
        text: `✅ Delivery confirmed: received by ${receiverName.trim()}. Code verified: ${code}.${photoDetail}${sigDetail}${notes ? ' Notes: ' + notes : ''}`,
        authorName: state.auth?.name ?? 'Driver',
        createdAt: new Date().toISOString(),
      },
    })
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'delivered' })
    dispatch({ type: 'SET_SUBSTEP',   orderId, substep: 'at_dropoff' })
    haptic('success')
    setSubmitting(false)
    onConfirmed()
  }

  const handleUnavailable = () => {
    const photoDetail = photoUrl ? ` Door photo: ${photoUrl}` : (photoPreview ? ' (door photo captured locally)' : '')
    dispatch({
      type: 'ADD_NOTE', orderId,
      note: {
        id: `unavail-${Date.now()}`,
        text: `⚠️ Recipient unavailable — delivery failed.${photoDetail}${notes ? ' Notes: ' + notes : ''}`,
        authorName: state.auth?.name ?? 'Driver',
        createdAt: new Date().toISOString(),
      },
    })
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'cancelled' })
    // Route to dashboard, not onBack — onBack goes to DeliveryScreen which
    // would resolve the cancelled order back to the pickup step and loop.
    ;(onUnavailable ?? onBack)()
  }

  const extrasCount = (photoPreview ? 1 : 0) + (signed ? 1 : 0) + (notes.trim() ? 1 : 0)
  const message = CODE_MESSAGES[codeState]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--d-bg)', color: 'var(--d-ink)', overflow: 'hidden' }}>
      <ScreenHeader title="At drop-off" subtitle={order.id} onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div className="d-stack" style={{ padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ padding: '0 4px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7 }}>Hand it off</div>
            <div style={{ fontSize: 15, color: 'var(--d-muted)', marginTop: 4 }}>
              {order.dropoff.address.split(',')[0]}{order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}
            </div>
          </div>

          {/* Code — the one required step */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 22, padding: '22px 16px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 17, fontWeight: 650 }}>Enter the recipient's code</div>
              <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 4, lineHeight: 1.45 }}>
                Ask {order.dropoff.name.split(' ')[0] || 'the recipient'} for the 4-digit code CitySend sent them.
              </div>
            </div>
            <CodeEntry value={code} onChange={v => { setCode(v); if (codeState === 'offline' || codeState === 'invalid') setCodeState('idle') }} state={codeState} />
            <div style={{ minHeight: 22, marginTop: 14, textAlign: 'center', fontSize: 14, lineHeight: 1.45 }}>
              {codeState === 'checking' && <span style={{ color: 'var(--d-muted)' }}>Checking…</span>}
              {codeState === 'valid' && (
                <span style={{ color: 'var(--d-ok)', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="check" size={17} stroke={2.6} /> Code verified
                </span>
              )}
              {message && <span role="alert" style={{ color: 'var(--d-err)' }}>{message}</span>}
            </div>
            {codeState === 'offline' && (
              <Button size="md" variant="secondary" onClick={() => { const c = code; setCode(''); setTimeout(() => setCode(c), 0) }} style={{ marginTop: 10 }}>Try again</Button>
            )}
          </div>

          {/* Received by */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 18, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 4 }}>Received by</div>
            {editingName ? (
              <input
                autoFocus
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                onBlur={() => receiverName.trim() && setEditingName(false)}
                placeholder="Full name"
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid var(--d-accent)', background: 'var(--d-surface-2)', color: 'var(--d-ink)', fontSize: 16, outline: 'none' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>{receiverName || 'Not set'}</div>
                <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', padding: 4, color: 'var(--d-accent)', fontSize: 14, fontWeight: 650, cursor: 'pointer' }}>
                  Someone else?
                </button>
              </div>
            )}
          </div>

          {/* Optional extras, tucked away */}
          <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 18, overflow: 'hidden' }}>
            <button
              onClick={() => { haptic('tap'); setShowExtras(v => !v) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-ink)', textAlign: 'left' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Extra proof <span style={{ color: 'var(--d-muted)', fontWeight: 400 }}>(optional)</span></div>
                <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>
                  {extrasCount ? `${extrasCount} added` : 'Photo, signature or a note'}
                </div>
              </div>
              <span style={{ color: 'var(--d-muted)', transform: showExtras ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                <Icon name="chevron" size={18} />
              </span>
            </button>
            {showExtras && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <PhotoCapture
                  orderId={orderId}
                  label="dropoff"
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
                <SignaturePad canvasRef={canvasRef} signed={signed} setSigned={setSigned} />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Note, e.g. left with the concierge"
                  rows={2}
                  style={{ width: '100%', resize: 'none', padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--d-border)', background: 'var(--d-surface-2)', color: 'var(--d-ink)', fontSize: 15, outline: 'none', lineHeight: 1.4 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', background: 'var(--d-surface)', borderTop: '1px solid var(--d-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button size="xl" variant="go" icon={canComplete ? 'check' : undefined} disabled={!canComplete || submitting} onClick={handleComplete}>
          {submitting ? 'Completing…'
            : canComplete ? 'Complete delivery'
            : photoUploading ? 'Uploading photo…'
            : !receiverName.trim() ? 'Add who received it'
            : 'Enter the code to continue'}
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="md" variant="ghost" style={{ color: 'var(--d-err)' }} onClick={() => setShowUnavailable(true)}>Recipient not available</Button>
          <Button size="md" variant="ghost" onClick={() => window.open('mailto:support@citysend.ca?subject=Help+with+delivery+' + orderId)}>Get help</Button>
        </div>
      </div>

      {showUnavailable && (
        <UnavailableSheet
          hasPhoto={!!photoPreview}
          onClose={() => setShowUnavailable(false)}
          onConfirm={() => { setShowUnavailable(false); handleUnavailable() }}
        />
      )}
    </div>
  )
}
