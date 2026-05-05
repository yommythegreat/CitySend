import React, { useState, useRef } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Height from bottom when collapsed (0-100 as percentage of viewport) */
  collapsedHeight?: number
}

/**
 * BottomSheet — Draggable modal that slides up from bottom.
 *
 * Features:
 * - Draggable handle to dismiss or collapse
 * - Doesn't cover entire screen (allows map visibility)
 * - Smooth animations
 * - Touch + mouse support
 */
export function BottomSheet({
  isOpen, onClose, title, children, collapsedHeight = 35,
}: Props) {
  const [dragY, setDragY] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const DISMISS_THRESHOLD = 80  // pixels down to dismiss

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const delta = currentY - startYRef.current
    if (delta > 0) {
      // Dragging downward — allow drag
      setDragY(delta)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > DISMISS_THRESHOLD) {
      onClose()
      setDragY(0)
    } else {
      // Snap back to position
      setDragY(0)
    }
  }

  // Mouse fallback for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const delta = e.clientY - startYRef.current
    if (delta > 0) {
      setDragY(delta)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (dragY > DISMISS_THRESHOLD) {
      onClose()
      setDragY(0)
    } else {
      setDragY(0)
    }
  }

  if (!isOpen) return null

  // Calculate sheet position
  const sheetTop = isCollapsed ? `calc(100vh - ${collapsedHeight}vh)` : 'auto'
  const sheetBottom = isCollapsed ? 0 : 'auto'
  const sheetTransform = `translateY(${dragY}px)`

  return (
    <>
      {/* Overlay — dismiss on tap */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 98,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: sheetBottom,
          top: sheetTop,
          left: 0,
          right: 0,
          background: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isCollapsed ? `${collapsedHeight}vh` : '80vh',
          overflow: 'hidden',
          transform: sheetTransform,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Handle (draggable area) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            paddingTop: 12,
            paddingBottom: 8,
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              background: 'var(--d-border)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 12,
              borderBottom: '1px solid var(--d-border)',
            }}
          >
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--d-ink)',
            }}>
              {title}
            </div>
          </div>
        )}

        {/* Content (scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px 20px',
            scrollbarWidth: 'thin',
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
