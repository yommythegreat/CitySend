import React from 'react'

interface StepsProps {
  total: number
  current: number
}

export function Steps({ total, current }: StepsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= current ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
            transition: 'width .3s, background .3s',
          }}
        />
      ))}
    </div>
  )
}
