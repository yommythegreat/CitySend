import React, { useState, useMemo } from 'react'
import { useDriver } from '../store/DriverContext'
import type { Order } from '@shared/types'

interface Props {
  order:      Order
  onContinue: () => void
}

/**
 * EarningsScreen — Job complete confirmation (DCompleteScreen design).
 * Dark ink background, double-ring green check, earnings card,
 * running today total, star rating, Stay online / End shift CTAs.
 */
export function EarningsScreen({ order, onContinue }: Props) {
  const { completedOrders } = useDriver()
  const [rating, setRating] = useState(5)

  const baseFare    = 5.99
  const distanceFee = order.distanceKm * 1.5
  const tip         = order.priceBreakdown?.tip ?? 0
  const total       = baseFare + distanceFee + tip
  const [dollars, cents] = total.toFixed(2).split('.')

  // Running total for today (excluding this job, then add it)
  const todayEarnings = useMemo(() => {
    const today = new Date().toDateString()
    return completedOrders
      .filter(o => o.id !== order.id && new Date(o.updatedAt).toDateString() === today)
      .reduce((sum, o) => sum + 5.99 + (o.distanceKm ?? 0) * 1.5, 0)
  }, [completedOrders, order.id])

  const todayTotal = todayEarnings + total
  const todayJobs  = completedOrders.filter(o => new Date(o.updatedAt).toDateString() === new Date().toDateString()).length

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div style={{
      background: '#111827', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Confirmation glyph */}
      <div style={{ padding: '64px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Outer ring */}
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'rgba(63,185,107,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          {/* Inner circle */}
          <div style={{
            width: 40, height: 40, borderRadius: 20, background: '#3fb96b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11l5 5L18 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Delivered · {timeStr}
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1, color: '#fff', marginTop: 8, lineHeight: 1.1 }}>
          Nice work.<br/>Booked.
        </div>
      </div>

      {/* Earnings card */}
      <div style={{ padding: '28px 20px 12px' }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 20 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', letterSpacing: 1.4, textTransform: 'uppercase' }}>
            You earned
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 54, fontWeight: 600, letterSpacing: -2.2, color: '#111827', lineHeight: 1 }}>
              ${dollars}<span style={{ color: '#9ca3af' }}>.{cents}</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>CAD</div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Base fare',        value: `$${baseFare.toFixed(2)}`,    accent: false },
              { label: 'Distance',         value: `${order.distanceKm.toFixed(1)} km`, accent: false },
              tip > 0
                ? { label: 'Tip from sender', value: `+$${tip.toFixed(2)}`,  accent: true }
                : null,
              { label: 'Time on job',      value: `~${Math.round(order.distanceKm * 5 + 10)} min`, accent: false },
            ].filter(Boolean).map((row) => (
              <div key={row!.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <div style={{ color: '#374151' }}>{row!.label}</div>
                <div style={{
                  fontFamily: 'monospace',
                  color: row!.accent ? '#c94a1b' : '#111827',
                  fontWeight: row!.accent ? 600 : 500,
                }}>{row!.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today running total */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14, color: '#fff',
          border: '1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: '#c94a1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Wallet icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="14" height="10" rx="2"/>
              <path d="M5 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/>
              <circle cx="12.5" cy="10" r="1"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>
              Today so far
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>
              ${todayTotal.toFixed(2)} · {todayJobs} jobs
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4l4 4-4 4"/>
          </svg>
        </div>
      </div>

      {/* Rate sender */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: 18,
          border: '1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 20,
              background: 'linear-gradient(135deg, #c94a1b, #e76a3a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#fff',
            }}>
              {order.customerName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'CS'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>How was {order.customerName?.split(' ')[0] ?? 'the sender'}?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Optional — only the rating is shared.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                style={{
                  flex: 1, height: 44, borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: n <= rating ? '#f59e0b' : 'rgba(255,255,255,.2)',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor" stroke="none">
                  <path d="M13 2l2.9 8.3H24l-7.1 5.1 2.7 8.3L13 18.9l-6.6 4.8 2.7-8.3L2 10.3h8.1z"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ padding: '16px 20px', paddingBottom: 'max(36px, env(safe-area-inset-bottom, 36px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onContinue}
          style={{
            width: '100%', height: 56, borderRadius: 28, border: 'none', cursor: 'pointer',
            background: '#c94a1b', color: '#fff',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 12px 24px -8px rgba(201,74,27,.5)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2l10 6-10 6V2z"/>
          </svg>
          Stay online · find next job
        </button>
        <button
          onClick={onContinue}
          style={{
            width: '100%', height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,.7)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
          }}
        >End shift</button>
      </div>
    </div>
  )
}
