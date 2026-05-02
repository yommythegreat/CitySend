import React, { useState, ReactNode } from 'react'

interface FieldProps {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: ReactNode
  suffix?: string
  type?: string
  onFocus?: () => void
  onBlur?: () => void
  maxLength?: number
}

export function Field({ label, value, onChange, placeholder, icon, suffix, type = 'text', onFocus, onBlur, maxLength }: FieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <label style={{ display: 'block' }}>
      {label && (
        <div style={{
          fontSize: 12,
          fontFamily: 'var(--cs-mono)',
          color: 'var(--cs-slate-500)',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 52,
        padding: '0 16px',
        background: '#fff',
        border: `1.5px solid ${focused ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
        borderRadius: 12,
        transition: 'border-color .15s',
      }}>
        {icon && <div style={{ color: 'var(--cs-slate-500)', display: 'flex', flexShrink: 0 }}>{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--cs-font)',
            fontSize: 16,
            color: 'var(--cs-ink)',
            minWidth: 0,
          }}
        />
        {suffix && (
          <div style={{ color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)', fontSize: 13, flexShrink: 0 }}>
            {suffix}
          </div>
        )}
      </div>
    </label>
  )
}
