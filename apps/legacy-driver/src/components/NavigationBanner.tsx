import React, { useEffect, useState } from 'react'

interface Props {
  /** Instruction text (e.g. "Turn left onto Princess St") */
  instruction: string
  /** Optional: auto-dismiss after N milliseconds */
  autoDismissMs?: number
  /** Called when user dismisses */
  onDismiss?: () => void
}

/**
 * NavigationBanner — Sticky navigation instruction bar.
 * Appears at top of screen with orange accent color.
 */
export function NavigationBanner({
  instruction, autoDismissMs, onDismiss,
}: Props) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (!autoDismissMs) return
    const timer = setTimeout(() => {
      setShow(false)
      onDismiss?.()
    }, autoDismissMs)
    return () => clearTimeout(timer)
  }, [autoDismissMs, onDismiss])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        right: 12,
        background: 'var(--d-accent)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        animation: 'slideDown 0.3s ease-out',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <span style={{ marginRight: 12, fontSize: 18 }}>📍</span>
      <span style={{ flex: 1 }}>{instruction}</span>
      <button
        onClick={() => {
          setShow(false)
          onDismiss?.()
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 6,
          marginLeft: 8,
        }}
      >
        ✕
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
