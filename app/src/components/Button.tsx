import React, { useState, ReactNode } from 'react'

type ButtonKind = 'primary' | 'ink' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  kind?: ButtonKind
  size?: ButtonSize
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  full?: boolean
  icon?: ReactNode
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
}

const SIZES: Record<ButtonSize, { h: number; fs: number; px: number; gap: number }> = {
  sm: { h: 36, fs: 14, px: 14, gap: 6 },
  md: { h: 48, fs: 15, px: 18, gap: 8 },
  lg: { h: 56, fs: 17, px: 22, gap: 10 },
}

const KINDS: Record<ButtonKind, { bg: string; color: string; border: string; shadow: string }> = {
  primary:   { bg: 'var(--cs-accent)', color: '#fff', border: 'none', shadow: '0 1px 0 rgba(0,0,0,.04), 0 6px 16px -6px rgba(201,74,27,.5)' },
  ink:       { bg: 'var(--cs-ink)',    color: '#fff', border: 'none', shadow: '0 1px 0 rgba(0,0,0,.04), 0 6px 16px -6px rgba(11,18,32,.4)' },
  secondary: { bg: '#fff', color: 'var(--cs-ink)', border: '1px solid var(--cs-slate-200)', shadow: 'none' },
  ghost:     { bg: 'transparent', color: 'var(--cs-ink)', border: 'none', shadow: 'none' },
}

export function Button({ kind = 'primary', size = 'md', children, onClick, disabled, full, icon, style, type = 'button' }: ButtonProps) {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  const s = SIZES[size]
  const k = KINDS[kind]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false) }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontSize: s.fs,
        width: full ? '100%' : undefined,
        gap: s.gap,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--cs-font)',
        fontWeight: 500,
        letterSpacing: -0.2,
        borderRadius: 999,
        cursor: disabled ? 'default' : 'pointer',
        opacity: 1,
        background: disabled ? 'var(--cs-slate-150, #e8ebf0)' : k.bg,
        color: disabled ? 'var(--cs-slate-400)' : k.color,
        border: disabled ? 'none' : k.border,
        boxShadow: disabled ? 'none' : k.shadow,
        transform: !disabled && press ? 'scale(.97)' : 'scale(1)',
        filter: hover && !disabled && !press ? 'brightness(1.08)' : 'none',
        transition: 'transform .1s, filter .1s',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  )
}
