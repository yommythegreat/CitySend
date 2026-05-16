import React, { useState, useRef, useEffect } from 'react'

interface Props {
  label:           string
  onSlideComplete: () => void
  /** 'dark' = black (en-route), 'green' = confirm/complete */
  variant?:        'dark' | 'green'
  disabled?:       boolean
}

export function SlideAction({ label, onSlideComplete, variant = 'dark', disabled = false }: Props) {
  const [drag,     setDrag]     = useState(0)   // 0..1 normalised
  const [done,     setDone]     = useState(false)
  const trackRef   = useRef<HTMLDivElement>(null)
  const startX     = useRef(0)
  const startDrag  = useRef(0)
  const dragging   = useRef(false)

  const THUMB = 56

  const bg = disabled ? '#9ca3af'
           : variant === 'green' ? '#166b3a'
           : '#111827'

  const onDown = (clientX: number) => {
    if (disabled || done) return
    dragging.current = true
    startX.current   = clientX
    startDrag.current = drag
  }

  const onMove = (clientX: number) => {
    if (!dragging.current || !trackRef.current) return
    const w    = trackRef.current.offsetWidth - THUMB
    const dx   = clientX - startX.current
    const next = Math.max(0, Math.min(1, startDrag.current + dx / w))
    setDrag(next)
  }

  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (drag > 0.92) {
      setDrag(1)
      setDone(true)
      setTimeout(() => {
        onSlideComplete()
        setDrag(0)
        setDone(false)
      }, 280)
    } else {
      setDrag(0)
    }
  }

  // Global listeners so drag works when pointer leaves thumb
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX
      onMove(x)
    }
    const up = () => onUp()
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend',  up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend',  up)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const thumbLeft = `calc(${drag * 100}% - ${drag * THUMB}px + 4px)`

  return (
    <div
      ref={trackRef}
      onMouseDown={e => onDown(e.clientX)}
      onTouchStart={e => onDown(e.touches[0].clientX)}
      style={{
        position: 'relative', width: '100%', height: 56, borderRadius: 32,
        background: bg, overflow: 'hidden',
        boxShadow: '0 10px 24px -10px rgba(11,18,32,.4)',
        userSelect: 'none', touchAction: 'none',
        cursor: disabled ? 'not-allowed' : 'grab',
        flexShrink: 0,
      }}
    >
      {/* Track fill overlay */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: `calc(${THUMB}px + ${drag * 100}%)`,
        background: 'rgba(255,255,255,.12)',
        transition: dragging.current ? 'none' : 'width .25s ease',
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
        opacity: 1 - drag * 0.9, pointerEvents: 'none',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {label}
          <span style={{ fontSize: 18, opacity: 0.6, letterSpacing: 2 }}>›  ›  ›</span>
        </span>
      </div>

      {/* Thumb */}
      <div style={{
        position: 'absolute', top: 4,
        left: thumbLeft,
        width: THUMB - 8, height: 48,
        borderRadius: 24,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,.18)',
        cursor: disabled ? 'not-allowed' : 'grab',
        transition: dragging.current ? 'none' : 'left .25s ease',
        pointerEvents: 'none',
      }}>
        {done ? (
          /* Check icon */
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4.5 4.5L16 6" stroke={bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          /* Arrow icon */
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4l5 5-5 5" stroke={bg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}
