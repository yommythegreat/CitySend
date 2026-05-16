import React from 'react'
import { EarningsCard } from '../components/EarningsCard'
import type { Order } from '@shared/types'

interface Props {
  order: Order
  onContinue: () => void
}

/**
 * EarningsScreen — Delivery complete confirmation with breakdown.
 *
 * Shown after driver completes delivery.
 * Displays order summary + earnings breakdown.
 * "Stay online" button returns to dashboard.
 */
export function EarningsScreen({ order, onContinue }: Props) {
  const distanceKm = order.distanceKm
  // Simple calculation: base ($5.99) + distance ($1.50/km)
  const baseFare = 5.99
  const distanceFee = distanceKm * 1.5
  const tip = 0  // Would come from customer if they added one
  const total = baseFare + distanceFee + tip

  const earnings = {
    baseFare,
    distance: distanceKm,
    time: 25,  // placeholder
    tip,
    total,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f0f0, #e8e8e8)',
      padding: '20px',
      textAlign: 'center',
    }}>
      {/* Check icon */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#22c55e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        marginBottom: 24,
        animation: 'popIn 0.5s ease-out',
      }}>
        ✓
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--d-ink)',
        marginBottom: 4,
      }}>
        Nice work.
      </h1>
      <p style={{
        fontSize: 18,
        color: 'var(--d-muted)',
        marginBottom: 28,
      }}>
        Booked.
      </p>

      {/* Order summary card */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        maxWidth: 400,
        marginBottom: 20,
        border: '1px solid var(--d-border)',
      }}>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--d-muted)', marginBottom: 12 }}>
          {order.id}
        </div>
        <div style={{ fontSize: 13, color: 'var(--d-ink)', marginBottom: 6 }}>
          <strong>{order.pickup.name}</strong> → <strong>{order.dropoff.name}</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>
          {order.distanceKm.toFixed(1)} km
        </div>
      </div>

      {/* Earnings breakdown */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}>
        <EarningsCard earnings={earnings} compact={false} />
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '16px 20px',
          background: 'var(--d-accent)',
          border: 'none',
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--d-accent-dark, #c74b1b)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--d-accent)'
        }}
      >
        Stay Online — Find Next Job
      </button>

      <style>{`
        @keyframes popIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
