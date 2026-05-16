import React, { useState, useRef } from 'react'
import { useDriver } from '../store/DriverContext'
import { SlideAction } from '../components/SlideAction'

interface Props {
  orderId:     string
  onBack:      () => void
  onConfirmed: () => void
}

type ProofTab = 'signature' | 'photo' | 'code'

export function ProofOfDeliveryScreen({ orderId, onBack, onConfirmed }: Props) {
  const { state, dispatch } = useDriver()
  const order = state.orders.find(o => o.id === orderId)

  const [activeTab,    setActiveTab]    = useState<ProofTab>('signature')
  const [receiverName, setReceiverName] = useState(order?.dropoff.name ?? '')
  const [notes,        setNotes]        = useState('')
  const [signed,       setSigned]       = useState(false)
  const [photoAdded,   setPhotoAdded]   = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const lastPt    = useRef({ x: 0, y: 0 })

  if (!order) return null

  // ── Signature canvas ──────────────────────────────────────────────────────

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
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

  // ── Submit ────────────────────────────────────────────────────────────────

  const canSubmit = (() => {
    if (!receiverName.trim()) return false
    if (activeTab === 'signature' && !signed)   return false
    if (activeTab === 'photo'     && !photoAdded) return false
    return true
  })()

  const handleSubmit = async () => {
    if (!receiverName.trim()) { setError('Receiver name is required.'); return }
    if (activeTab === 'signature' && !signed)    { setError('Please capture a signature.'); return }
    if (activeTab === 'photo'     && !photoAdded){ setError('Please add a photo.'); return }
    setError('')
    setSubmitting(true)

    await new Promise(r => setTimeout(r, 600))

    dispatch({
      type: 'ADD_NOTE', orderId,
      note: {
        id:         `pod-${Date.now()}`,
        text:       `✅ Delivery confirmed: received by ${receiverName.trim()} via ${activeTab}.${notes ? ' Notes: ' + notes : ''}`,
        authorName: state.auth?.name ?? 'Driver',
        createdAt:  new Date().toISOString(),
      },
    })

    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'delivered' })
    dispatch({ type: 'SET_SUBSTEP',   orderId, substep: 'at_dropoff' })

    setSubmitting(false)
    onConfirmed()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#f5f6f8', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#1a1a1a',
        padding: '52px 20px 24px',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 16, left: 16,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: 1 }}>
          AT DROP-OFF · {order.id}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          Hand it off.
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
          {order.dropoff.address.split(',')[0]}
          {order.dropoff.unit ? ` · ${order.dropoff.unit}` : ''}
          {' · '}{order.dropoff.name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
          Choose how to record proof of delivery.
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: '#fff',
        borderBottom: '1px solid #e8ebf0',
        flexShrink: 0,
      }}>
        {(['photo', 'signature', 'code'] as ProofTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? 'var(--d-accent)' : 'var(--d-muted)',
              borderBottom: activeTab === tab ? '2.5px solid var(--d-accent)' : '2.5px solid transparent',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'photo'     ? '📷 Photo'
             : tab === 'signature' ? '✍️ Signature'
             : '🔢 Code'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'none' }}>

        {/* Recipient name (always shown) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Received by
          </div>
          <input
            type="text"
            value={receiverName}
            onChange={e => setReceiverName(e.target.value)}
            placeholder="Full name of person who received the parcel"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', border: '1.5px solid #e8ebf0',
              borderRadius: 10, fontSize: 14, outline: 'none',
              fontFamily: 'inherit', background: '#fff',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 4 }}>
            Pre-filled with recipient name — update if someone else received it.
          </div>
        </div>

        {/* ── Tab: Signature ─────────────────────────────────────────────────── */}
        {activeTab === 'signature' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recipient signature
              </div>
              {signed && (
                <button
                  onClick={clearSignature}
                  style={{ fontSize: 12, color: 'var(--d-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{
              border: `2px solid ${signed ? '#22c55e' : '#e8ebf0'}`,
              borderRadius: 12, overflow: 'hidden', background: '#fafafa',
              position: 'relative',
              transition: 'border-color 0.2s',
            }}>
              <canvas
                ref={canvasRef}
                width={360}
                height={140}
                style={{ width: '100%', height: 140, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!signed && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#bbb', pointerEvents: 'none',
                }}>
                  ✍️ Sign here
                </div>
              )}
            </div>
            {signed && (
              <div style={{ fontSize: 12, color: '#22c55e', marginTop: 6, fontWeight: 500 }}>
                ✓ Signature captured
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Photo ────────────────────────────────────────────────────── */}
        {activeTab === 'photo' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Delivery photo
            </div>
            {!photoAdded ? (
              <button
                onClick={() => setPhotoAdded(true)}
                style={{
                  width: '100%', height: 140,
                  border: '2px dashed #e8ebf0', borderRadius: 12, background: '#fafafa',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, color: 'var(--d-muted)',
                }}
              >
                <span style={{ fontSize: 36 }}>📷</span>
                Tap to capture delivery photo
              </button>
            ) : (
              <div
                onClick={() => setPhotoAdded(false)}
                style={{
                  width: '100%', height: 140,
                  border: '2px solid #22c55e', borderRadius: 12,
                  background: 'rgba(34,197,94,0.06)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 36 }}>✓</span>
                <div style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>Photo captured</div>
                <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>Tap to retake</div>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>
              Camera access is simulated in this demo.
            </div>
          </div>
        )}

        {/* ── Tab: Code ─────────────────────────────────────────────────────── */}
        {activeTab === 'code' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Delivery code
            </div>
            <div style={{
              background: '#fafafa', border: '1.5px dashed #e8ebf0', borderRadius: 12,
              padding: 20, textAlign: 'center', color: 'var(--d-muted)',
            }}>
              <div style={{ fontSize: 32 }}>🔢</div>
              <div style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>Code verification</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Coming in a future release</div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--d-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Delivery notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Left at front door, given to concierge, etc."
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: 70, resize: 'vertical',
              border: '1.5px solid #e8ebf0', borderRadius: 10, padding: '10px 12px',
              fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
            borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 12,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div style={{
        padding: '14px 20px', background: '#fff',
        borderTop: '1px solid #e8ebf0', flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 14px)',
        display: 'flex', justifyContent: 'center',
      }}>
        <SlideAction
          label={submitting ? 'Confirming…' : 'Slide to complete delivery'}
          onSlideComplete={handleSubmit}
          disabled={!canSubmit || submitting}
          color="#22c55e"
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
