import React from 'react'

interface EarningsBreakdown {
  baseFare: number
  distance: number  // km
  time?: number     // minutes
  tip?: number
  total: number
}

interface Props {
  earnings: EarningsBreakdown
  /** Optional: show as compact (for dashboard) vs expanded (for detail screen) */
  compact?: boolean
}

/**
 * EarningsCard — Display earnings breakdown.
 *
 * Compact mode: dark card with total (for dashboard)
 * Expanded mode: detailed breakdown with all fields
 */
export function EarningsCard({ earnings, compact = false }: Props) {
  const fmtMoney = (n: number) => `$${n.toFixed(2)}`

  if (compact) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1f1f1f, #2a2a2a)',
          borderRadius: 16,
          padding: 20,
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
          EARNINGS TODAY
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.8 }}>
          {fmtMoney(earnings.total)}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 12, lineHeight: 1.6 }}>
          <div>{earnings.distance.toFixed(1)} km • Base + Distance</div>
        </div>
      </div>
    )
  }

  // Expanded mode
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid var(--d-border)',
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 16 }}>
        Earnings Breakdown
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Base fare */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--d-border)' }}>
          <span style={{ fontSize: 14, color: 'var(--d-ink)' }}>Base fare</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{fmtMoney(earnings.baseFare)}</span>
        </div>

        {/* Distance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--d-border)' }}>
          <span style={{ fontSize: 14, color: 'var(--d-ink)' }}>
            Distance <span style={{ color: 'var(--d-muted)', fontSize: 12 }}>({earnings.distance.toFixed(1)} km)</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{fmtMoney(earnings.distance * 1.5)}</span>
        </div>

        {/* Time (if provided) */}
        {earnings.time !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--d-border)' }}>
            <span style={{ fontSize: 14, color: 'var(--d-ink)' }}>
              Time <span style={{ color: 'var(--d-muted)', fontSize: 12 }}>({earnings.time} min)</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>{fmtMoney(earnings.time * 0.1)}</span>
          </div>
        )}

        {/* Tip (if provided) */}
        {earnings.tip !== undefined && earnings.tip > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--d-border)' }}>
            <span style={{ fontSize: 14, color: 'var(--d-ok)' }}>Tip 💰</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ok)' }}>{fmtMoney(earnings.tip)}</span>
          </div>
        )}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ink)' }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--d-accent)' }}>{fmtMoney(earnings.total)}</span>
        </div>
      </div>
    </div>
  )
}
