import React, { ReactNode } from 'react'

interface IconButtonProps {
  onClick?: () => void
  children: ReactNode
  glass?: boolean
  style?: React.CSSProperties
}

export function IconButton({ onClick, children, glass, style }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        background: glass ? 'rgba(255,255,255,0.9)' : 'var(--cs-slate-100)',
        backdropFilter: glass ? 'blur(10px)' : undefined,
        boxShadow: glass ? '0 4px 12px rgba(11,18,32,.12)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: 'var(--cs-ink)',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
