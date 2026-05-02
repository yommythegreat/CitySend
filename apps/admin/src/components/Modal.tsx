import React from 'react'

interface Props {
  title:    string
  onClose:  () => void
  width?:   number
  children: React.ReactNode
  footer?:  React.ReactNode
}

export function Modal({ title, onClose, width = 480, children, footer }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="a-fade"
        style={{
          background: 'var(--a-surface)', borderRadius: 12,
          width, maxWidth: '94vw', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--a-border)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--a-ink)' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: 'transparent', color: 'var(--a-muted)',
              fontSize: 18, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--a-border)',
            display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
