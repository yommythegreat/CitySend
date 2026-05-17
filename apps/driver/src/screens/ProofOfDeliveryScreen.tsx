import React, { useState, useRef, useEffect } from 'react'
import { useDriver } from '../store/DriverContext'
import { SlideAction } from '../components/SlideAction'
import { PhotoCapture } from '../components/PhotoCapture'
import { validateHandoffCode } from '@shared/utils/handoffCodeStore'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

interface Props {
  orderId:     string
  onBack:      () => void
  onConfirmed: () => void
}

type ProofTab = 'photo' | 'signature' | 'code'

export function ProofOfDeliveryScreen({ orderId, onBack, onConfirmed }: Props) {
  const { state, dispatch, completedOrders } = useDriver()
  const order = state.orders.find(o => o.id === orderId)

  const [activeTab,      setActiveTab]      = useState<ProofTab>('photo')
  const [receiverName,   setReceiverName]   = useState(order?.dropoff.name ?? '')
  const [notes,          setNotes]          = useState('')
  const [signed,         setSigned]         = useState(false)
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null)
  const [photoUrl,       setPhotoUrl]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')
  const [sigUrl,         setSigUrl]         = useState<string | null>(null)

  const [codeDigits, setCodeDigits] = useState(['', '', '', ''])
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const lastPt    = useRef({ x: 0, y: 0 })

  if (!order) return null

  // ── Signature canvas ──────────────────────────────────────────────────────

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    lastPt.current = getPos(e, canvas)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pt = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPt.current = pt
    setSigned(true)
  }

  const stopDraw = () => { drawing.current = false }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
  }

  const uploadSignature = async (): Promise<string | null> => {
    const canvas = canvasRef.current
    if (!canvas) return null
    try {
      const dataUrl = canvas.toDataURL('image/png')
      // Convert data URL to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const path = `signatures/${orderId}-${Date.now()}.png`
      const { data, error } = await supabase.storage.from('delivery-photos').upload(path, blob, { contentType: 'image/png', upsert: true })
      if (error || !data) return null
      const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(path)
      return urlData.publicUrl ?? null
    } catch { return null }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const codeComplete = codeDigits.every(d => d !== '')

  const canSubmit = (() => {
    if (!receiverName.trim()) return false
    if (activeTab === 'signature' && !signed)       return false
    if (activeTab === 'photo'     && !photoPreview) return false
    if (activeTab === 'code'      && !codeComplete) return false
    return true
  })()

  const handleSubmit = async () => {
    if (!receiverName.trim()) { setError('Receiver name is required.'); return }
    if (activeTab === 'signature' && !signed)       { setError('Please capture a signature.'); return }
    if (activeTab === 'photo'     && !photoPreview) { setError('Please add a photo.'); return }
    if (activeTab === 'code') {
      const valid = await validateHandoffCode(orderId, codeDigits.join(''))
      if (!valid) { setError('Incorrect code — ask the recipient to check their notification.'); return }
    }
    setError('')
    setSubmitting(true)
    let resolvedSigUrl = sigUrl
    if (activeTab === 'signature' && !sigUrl && isSupabaseConfigured) {
      resolvedSigUrl = await uploadSignature()
      if (resolvedSigUrl) setSigUrl(resolvedSigUrl)
    }
    const proofDetail = activeTab === 'code'      ? ` Code: ${codeDigits.join('')}.`
                      : activeTab === 'photo'     ? (photoUrl ? ` Photo: ${photoUrl}` : '')
                      : activeTab === 'signature' ? (resolvedSigUrl ? ` Signature: ${resolvedSigUrl}` : ' Signature captured.') : ''
    dispatch({
      type: 'ADD_NOTE', orderId,
      note: { id: `pod-${Date.now()}`, text: `✅ Delivery confirmed: received by ${receiverName.trim()} via ${activeTab}.${proofDetail}${notes ? ' Notes: ' + notes : ''}`, authorName: state.auth?.name ?? 'Driver', createdAt: new Date().toISOString() },
    })
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'delivered' })
    dispatch({ type: 'SET_SUBSTEP',   orderId, substep: 'at_dropoff' })
    setSubmitting(false)
    onConfirmed()
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { k: ProofTab; label: string }[] = [
    { k: 'photo',     label: 'Photo'     },
    { k: 'signature', label: 'Signature' },
    { k: 'code',      label: 'Code'      },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--d-bg)', overflow: 'hidden' }}>

      {/* Dark header */}
      <div style={{ background: '#111827', paddingTop: 'max(52px, env(safe-area-inset-top, 52px))', paddingBottom: 20, paddingLeft: 20, paddingRight: 20, flexShrink: 0, position: 'relative' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top, 14px))', left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', borderRadius: 99, padding: '4px 10px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.6 }}>ONLINE</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>TODAY</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{completedOrders.length} Jobs</div>
          </div>
        </div>

        {/* AT DROP-OFF tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, padding: '5px 12px', marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>AT DROP-OFF</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>{order.id}</span>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: -0.5 }}>
          Hand it off.
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
          {order.dropoff.address.split(',')[0]}{order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''} · {order.dropoff.name}. Choose how to record proof of delivery.
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid var(--d-border)', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.k} onClick={() => setActiveTab(tab.k)} style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: activeTab === tab.k ? 700 : 400,
            color: activeTab === tab.k ? 'var(--d-ink)' : 'var(--d-muted)',
            borderBottom: `2.5px solid ${activeTab === tab.k ? 'var(--d-ink)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'none' }}>

        {/* Received by (always) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Received by
          </div>
          <input
            type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)}
            placeholder="Full name of person who received the parcel"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1.5px solid var(--d-border)', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
          />
          <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 4 }}>
            Pre-filled with recipient — update if someone else received it.
          </div>
        </div>

        {/* ── Photo tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'photo' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Delivery photo
            </div>
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
          </div>
        )}

        {/* ── Signature tab ─────────────────────────────────────────────────── */}
        {activeTab === 'signature' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Recipient signature</div>
              {signed && <button onClick={clearSignature} style={{ fontSize: 12, color: 'var(--d-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>}
            </div>
            <div style={{ border: `1.5px solid ${signed ? '#22c55e' : 'var(--d-border)'}`, borderRadius: 12, overflow: 'hidden', background: '#fafafa', position: 'relative', transition: 'border-color 0.2s' }}>
              <canvas
                ref={canvasRef} width={360} height={140}
                style={{ width: '100%', height: 140, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              {!signed && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#bbb', pointerEvents: 'none' }}>
                  Sign here
                </div>
              )}
            </div>
            {signed && <div style={{ fontSize: 12, color: '#22c55e', marginTop: 6, fontWeight: 500 }}>✓ Signature captured</div>}
          </div>
        )}

        {/* ── Code tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'code' && (
          <div style={{ marginBottom: 16, background: '#fff', border: '1.5px solid var(--d-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#374151', textAlign: 'center', maxWidth: 260 }}>
              Ask the recipient for the 4-digit code from their notification.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {codeDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={codeRefs[i]}
                  value={digit}
                  maxLength={1}
                  inputMode="numeric"
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 1)
                    const next = [...codeDigits]; next[i] = val; setCodeDigits(next)
                    if (val && i < 3) codeRefs[i + 1].current?.focus()
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !digit && i > 0) codeRefs[i - 1].current?.focus()
                  }}
                  style={{
                    width: 56, height: 64, textAlign: 'center', fontSize: 28,
                    fontFamily: 'monospace', fontWeight: 600, color: '#111827',
                    border: `1.5px solid ${digit ? '#111827' : 'var(--d-border)'}`,
                    borderRadius: 12, outline: 'none', background: '#fff',
                    transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--d-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
              4-digit handoff code
            </div>
            {codeComplete && (
              <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>✓ Code entered</div>
            )}
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Delivery notes <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12 }}>(optional)</span>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Left at front door, given to concierge, etc." style={{ width: '100%', boxSizing: 'border-box', minHeight: 70, resize: 'vertical', border: '1.5px solid var(--d-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
        </div>

        {error && (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid var(--d-border)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 12px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {canSubmit ? (
          <SlideAction
            label={submitting ? 'Confirming…' : 'Slide to complete delivery'}
            variant="green"
            onSlideComplete={handleSubmit}
            disabled={submitting}
          />
        ) : (
          <button disabled style={{ width: '100%', padding: '16px 0', border: 'none', borderRadius: 28, background: '#e5e7eb', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'not-allowed' }}>
            {activeTab === 'photo' ? 'Take a photo to continue' : activeTab === 'signature' ? 'Capture a signature to continue' : 'Enter the 4-digit code to continue'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => {
            if (window.confirm('Mark as failed delivery? The order will be flagged for admin review.')) {
              dispatch({ type: 'ADD_NOTE', orderId, note: { id: `unavail-${Date.now()}`, text: '⚠️ Recipient unavailable — delivery failed', authorName: state.auth?.name ?? 'Driver', createdAt: new Date().toISOString() } })
              dispatch({ type: 'UPDATE_STATUS', orderId, status: 'cancelled' })
              onBack()
            }
          }} style={{ flex: 1, padding: '11px 0', border: '1px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}>
            Recipient unavailable
          </button>
          <button onClick={() => window.open('mailto:support@citysend.ca?subject=Help+with+delivery+' + orderId)} style={{ flex: 1, padding: '11px 0', border: '1px solid var(--d-border)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 500, color: 'var(--d-muted)', cursor: 'pointer' }}>
            Need help?
          </button>
        </div>
      </div>
    </div>
  )
}
