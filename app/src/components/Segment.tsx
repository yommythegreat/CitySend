import React from 'react'

interface Option {
  value: string
  label: string
}

interface SegmentProps {
  options: Option[]
  value: string
  onChange: (v: string) => void
}

export function Segment({ options, value, onChange }: SegmentProps) {
  return (
    <div style={{
      display: 'flex',
      padding: 4,
      background: 'var(--cs-slate-100)',
      borderRadius: 12,
      gap: 2,
    }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              border: 'none',
              cursor: 'pointer',
              height: 36,
              padding: '0 14px',
              background: active ? '#fff' : 'transparent',
              color: active ? 'var(--cs-ink)' : 'var(--cs-slate-500)',
              fontFamily: 'var(--cs-font)',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 9,
              letterSpacing: -0.1,
              boxShadow: active ? '0 1px 2px rgba(11,18,32,.08)' : 'none',
              transition: 'all .15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
