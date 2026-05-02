import React, { useState, useRef } from 'react'
import { useDriver } from '../store/DriverContext'

interface Props {
  orderId: string
  onBack:      () => void
  onConfirmed: () => void
}

export function ProofOfDeliveryScreen({ orderId, onBack, onConfirmed }: Props) {
  const { state, dispatch } = useDriver()
  const order = state.orders.find(o => o.id === orderId)

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

  // ── Signature canvas handlers ─────────────────────────────────────────────

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

  const handleSubmit = async () => {
    if (!receiverName.trim()) { setError('Receiver name is required.'); return }
    if (!signed)               { setError('Signature is required to confirm delivery.'); return }
    setError('')
    setSubmitting(true)

    await new Promise(r => setTimeout(r, 600))

    // Add proof note
    dispatch({
      type: 'ADD_NOTE',
      orderId,
      note: {
        id:         `pod-${Date.now()}`,
        text:       `✅ Proof of delivery: received by ${receiverName.trim()}.${notes ? ' Notes: ' + notes : ''}`,
        authorName: state.auth?.name ?? 'Driver',
        createdAt:  new Date().toISOString(),
      },
    })

    // Mark order as delivered
    dispatch({ type: 'UPDATE_STATUS', orderId, status: 'delivered' })
    dispatch({ type: 'SET_SUBSTEP',   orderId, substep: 'at_dropoff' })

    setSubmitting(false)
    onConfirmed()
  }

  return (
    <>
      <div className="d-scroll">
        <div style={{ padding: '16px 12px' }}>

          {/* Header card */}
          <div className="d-card" style={{ marginBottom: 12 }}>
            <div className="d-card-section">
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 4 }}>Completing delivery for</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--d-ink)', marginBottom: 6 }}>{order.id}</div>
              <div style={{ fontSize: 14, color: 'var(--d-ink-2)' }}>
                Drop-off: <strong>{order.dropoff.address.split(',')[0]}</strong>
              </div>
            </div>
          </div>

          {/* Receiver name */}
          <div className="d-card" style={{ marginBottom: 12 }}>
            <div className="d-card-section">
              <div className="d-label">Received by *</div>
              <input
                className="d-input"
                type="text"
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                placeholder="Full name of person who received the parcel"
              />
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>
                Pre-filled with recipient name — update if someone else received it.
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="d-card" style={{ marginBottom: 12 }}>
            <div className="d-card-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="d-label" style={{ marginBottom: 0 }}>Signature *</div>
                {signed && (
                  <button
                    onClick={clearSignature}
                    style={{ fontSize: 12, color: 'var(--d-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Clear</button>
                )}
              </div>
              <div style={{
                border: `1.5px solid ${signed ? 'var(--d-ok)' : 'var(--d-border)'}`,
                borderRadius: 10, overflow: 'hidden', background: '#fafafa',
                position: 'relative',
              }}>
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={120}
                  style={{ width: '100%', height: 120, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
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
                    fontSize: 13, color: 'var(--d-muted-lt)', pointerEvents: 'none',
                  }}>
                    ✍️ Draw signature here
                  </div>
                )}
              </div>
              {signed && (
                <div style={{ fontSize: 11, color: 'var(--d-ok)', marginTop: 6, fontWeight: 500 }}>✓ Signature captured</div>
              )}
            </div>
          </div>

          {/* Photo placeholder */}
          <div className="d-card" style={{ marginBottom: 12 }}>
            <div className="d-card-section">
              <div className="d-label">Delivery Photo</div>
              {!photoAdded ? (
                <button
                  onClick={() => setPhotoAdded(true)}
                  style={{
                    width: '100%', height: 80, border: '2px dashed var(--d-border)',
                    borderRadius: 10, background: 'var(--d-surface-2)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, fontSize: 13, color: 'var(--d-muted)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>📷</span>
                  <span>Add photo (optional)</span>
                </button>
              ) : (
                <div style={{
                  width: '100%', height: 80, background: 'var(--d-surface-2)',
                  borderRadius: 10, border: '1.5px solid var(--d-ok-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, fontSize: 13, color: 'var(--d-ok)', fontWeight: 500,
                }}>
                  <span style={{ fontSize: 20 }}>✅</span> Photo added
                  <button
                    onClick={() => setPhotoAdded(false)}
                    style={{ marginLeft: 8, fontSize: 12, color: 'var(--d-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Remove</button>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>
                Camera access is simulated in this demo.
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="d-card" style={{ marginBottom: 12 }}>
            <div className="d-card-section">
              <div className="d-label">Delivery Notes</div>
              <textarea
                className="d-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Left at front door, given to concierge, etc. (optional)"
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 14px', background: 'var(--d-err-bg)',
              border: '1px solid var(--d-err-border)', borderRadius: 8,
              fontSize: 13, color: 'var(--d-err)', marginBottom: 12,
            }}>{error}</div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="d-bottom-bar">
        <button
          className="d-btn d-btn-success"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Submitting…
              </span>
            : '✅ Confirm Delivery'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
