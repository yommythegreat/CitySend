/**
 * Driver UI kit — the shared building blocks every screen should use, so
 * headers, buttons and cards look and behave the same app-wide (and follow
 * night mode automatically via the --d-* tokens in index.css).
 */

import React from 'react'
import { haptic } from '../lib/haptics'

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICON_PATHS = {
  back:     'M15 18l-6-6 6-6',
  chevron:  'M9 18l6-6-6-6',
  power:    'M12 3v8M6.4 6.4a8 8 0 1 0 11.2 0',
  bolt:     'M13 2L4 14h7l-1 8 9-12h-7z',
  wallet:   'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  clock:    'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  route:    'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  box:      'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  wifiOff:  'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.2-1.6M12 20h.01',
  flask:    'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
  phone:    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  message:  'M21 11.5a8.4 8.4 0 0 1-9 8.5 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.6A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z',
  alert:    'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  navigate: 'M3 11l19-9-9 19-2-8-8-2z',
  locate:   'M12 2v3M12 19v3M2 12h3M19 12h3M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  check:    'M20 6L9 17l-5-5',
  pin:      'M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  note:     'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
} as const

export type IconName = keyof typeof ICON_PATHS

export function Icon({ name, size = 20, stroke = 2, color = 'currentColor' }: {
  name: IconName; size?: number; stroke?: number; color?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={() => { haptic('tap'); onClick() }}
      aria-label={label}
      className="d-press"
      style={{
        width: 40, height: 40, borderRadius: 20, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--d-surface-2)', border: 'none', color: 'var(--d-ink)', cursor: 'pointer',
      }}
    >
      <Icon name="back" size={20} stroke={2.2} />
    </button>
  )
}

/** Sticky screen header with safe-area padding. Same on every screen. */
export function ScreenHeader({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode
}) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      background: 'var(--d-bg)',
      padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px',
      display: 'flex', alignItems: 'center', gap: 12, minHeight: 60,
    }}>
      {onBack && <BackButton onClick={onBack} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4, color: 'var(--d-ink)', lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function Card({ children, style, onClick, padded = true }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; padded?: boolean
}) {
  const base: React.CSSProperties = {
    background: 'var(--d-surface)', borderRadius: 'var(--d-radius-lg)',
    border: '1px solid var(--d-border)', boxShadow: 'var(--d-shadow)',
    padding: padded ? 18 : 0, width: '100%', textAlign: 'left', color: 'var(--d-ink)',
    ...style,
  }
  if (!onClick) return <div style={base}>{children}</div>
  return (
    <button className="d-press" onClick={() => { haptic('tap'); onClick() }} style={{ ...base, cursor: 'pointer', display: 'block' }}>
      {children}
    </button>
  )
}

export function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 4px 10px' }}>
      <div style={{ fontFamily: 'var(--d-mono)', fontSize: 11, fontWeight: 500, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--d-muted)' }}>
        {children}
      </div>
      {action}
    </div>
  )
}

export function TextLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={() => { haptic('tap'); onClick() }} style={{
      background: 'none', border: 'none', padding: 4, margin: -4, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, color: 'var(--d-accent)',
    }}>
      {children}
    </button>
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'go' | 'secondary' | 'ghost' | 'danger'

const BUTTON_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--d-accent)',    color: 'var(--d-on-accent)' },
  go:        { background: 'var(--d-ok)',        color: 'var(--d-on-ok)' },
  secondary: { background: 'var(--d-surface-2)', color: 'var(--d-ink)', border: '1px solid var(--d-border)' },
  ghost:     { background: 'transparent',        color: 'var(--d-ink)' },
  danger:    { background: 'var(--d-err-bg)',    color: 'var(--d-err)', border: '1px solid var(--d-err-border)' },
}

/** Large, thumb-friendly button. `size="xl"` is for the one primary action on a screen. */
export function Button({ children, onClick, variant = 'primary', size = 'lg', icon, disabled, full = true, style }: {
  children: React.ReactNode; onClick?: () => void; variant?: ButtonVariant
  size?: 'md' | 'lg' | 'xl'; icon?: IconName; disabled?: boolean; full?: boolean; style?: React.CSSProperties
}) {
  const height = size === 'xl' ? 60 : size === 'lg' ? 52 : 42
  return (
    <button
      className="d-press"
      disabled={disabled}
      onClick={() => { if (disabled) return; haptic(size === 'xl' ? 'confirm' : 'tap'); onClick?.() }}
      style={{
        height, width: full ? '100%' : undefined, padding: full ? 0 : '0 18px',
        borderRadius: height / 2, border: 'none', cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: size === 'xl' ? 17 : size === 'lg' ? 16 : 14, fontWeight: 600, letterSpacing: -0.1,
        opacity: disabled ? 0.45 : 1,
        ...BUTTON_STYLES[variant],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === 'md' ? 16 : 19} stroke={2.2} />}
      {children}
    </button>
  )
}

// ── Money ─────────────────────────────────────────────────────────────────────

export function money(n: number): string {
  return `$${n.toFixed(2)}`
}
