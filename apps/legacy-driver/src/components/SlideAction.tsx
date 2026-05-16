import React, { useState, useRef } from 'react'

interface Props {
  /** Label shown on the slider (e.g. "Slide to confirm pickup") */
  label: string
  /** Called when slider is dragged past threshold (~80%) */
  onSlideComplete: () => void
  /** Optional: custom color for track and thumb */
  color?: string
  /** Whether the action is disabled */
  disabled?: boolean
}

/**
 * SlideAction — Swipe-to-confirm interaction component.
 *
 * Horizontal slider that requires user to drag a thumb across a track.
 * Completes action only when dragged past 80% threshold.
 * Auto-resets if incomplete.
 */
export function SlideAction({
  label, onSlideComplete, color = 'var(--d-accent)', disabled = false,
}: Props) {
  const [slideX, setSlideX] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)

  const TRACK_WIDTH = 280
  const THRESHOLD = TRACK_WIDTH * 0.8
  const THUMB_SIZE = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    setIsSliding(true)
    startXRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSliding || disabled) return
    const currentX = e.touches[0].clientX
    const delta = currentX - startXRef.current
    const newSlideX = Math.max(0, Math.min(delta, TRACK_WIDTH - THUMB_SIZE))
    setSlideX(newSlideX)
  }

  const handleTouchEnd = () => {
    if (!isSliding) return
    setIsSliding(false)

    if (slideX > THRESHOLD) {
      // Threshold reached — fire action
      onSlideComplete()
      // Reset after a brief delay so user sees feedback
      setTimeout(() => setSlideX(0), 300)
    } else {
      // Snap back
      setSlideX(0)
    }
  }

  // Mouse fallback for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    setIsSliding(true)
    startXRef.current = e.clientX
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSliding || disabled) return
    const delta = e.clientX - startXRef.current
    const newSlideX = Math.max(0, Math.min(delta, TRACK_WIDTH - THUMB_SIZE))
    setSlideX(newSlideX)
  }

  const handleMouseUp = () => {
    if (!isSliding) return
    setIsSliding(false)

    if (slideX > THRESHOLD) {
      onSlideComplete()
      setTimeout(() => setSlideX(0), 300)
    } else {
      setSlideX(0)
    }
  }

  return (
    <div
      ref={trackRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: TRACK_WIDTH,
        height: 56,
        background: disabled ? 'var(--d-surface)' : '#fff',
        border: `2px solid ${color}`,
        borderRadius: 28,
        position: 'relative',
        cursor: disabled ? 'default' : 'grab',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 4,
        paddingRight: 4,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Thumb (draggable element) */}
      <div
        style={{
          width: THUMB_SIZE,
          height: 48,
          background: disabled ? 'var(--d-muted)' : color,
          borderRadius: 24,
          position: 'absolute',
          left: slideX,
          top: 4,
          transition: isSliding ? 'none' : 'left 0.15s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 20,
        }}
      >
        ›
      </div>

      {/* Label (centered in track) */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: disabled ? 'var(--d-muted)' : 'var(--d-ink)',
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 0,
        }}
      >
        {label}
      </div>
    </div>
  )
}
