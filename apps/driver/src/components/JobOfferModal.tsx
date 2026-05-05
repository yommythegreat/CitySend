import React, { useState, useEffect } from 'react'
import type { Order } from '@shared/types'

interface Props {
  order: Order
  onAccept: () => void
  onDecline: () => void
  onTimeout: () => void
}

/**
 * JobOfferModal — Job assignment overlay with countdown timer.
 *
 * Shows new job details and countdown (15s).
 * Auto-dismisses on timeout.
 */
export function JobOfferModal({ order, onAccept, onDecline, onTimeout }: Props) {
  const [timeRemaining, setTimeRemaining] = useState(15)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsExpired(true)
          onTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onTimeout])

  const pickupAddr = order.pickup.address.split(',')[0]
  const dropoffAddr = order.dropoff.address.split(',')[0]
  const distanceKm = order.distanceKm

  // Simple earnings estimate: base ($5.99) + distance ($1.50/km)
  const estimatedEarnings = 5.99 + (distanceKm * 1.5)

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          width: 'min(90vw, 360px)',
          maxHeight: '90vh',
          zIndex: 201,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          overflowY: 'auto',
          animation: 'popIn 0.3s ease-out',
        }}
      >
        {/* Timer badge (top right) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: isExpired ? 'var(--d-danger, #e74c3c)' : 'var(--d-accent)',
            color: '#fff',
            borderRadius: 20,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {isExpired ? 'Expired' : `${timeRemaining}s`}
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'var(--d-muted)',
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 4,
          }}>
            {order.id}
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--d-ink)',
          }}>
            New Job Available!
          </div>
        </div>

        {/* Route summary */}
        <div style={{
          background: 'var(--d-bg)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          {/* Pickup */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#22c55e',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
            }}>
              A
            </div>
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--d-ink)',
                marginBottom: 2,
              }}>
                {pickupAddr}
              </div>
              <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>
                {order.pickup.name}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            height: 20,
            marginLeft: 12,
            marginRight: 12,
            borderLeft: '2px dashed var(--d-border)',
          }} />

          {/* Dropoff */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--d-accent)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
            }}>
              B
            </div>
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--d-ink)',
                marginBottom: 2,
              }}>
                {dropoffAddr}
              </div>
              <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>
                {order.dropoff.name}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            background: 'var(--d-bg)',
            borderRadius: 10,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--d-muted)', marginBottom: 4 }}>Distance</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-ink)' }}>
              {distanceKm.toFixed(1)} km
            </div>
          </div>
          <div style={{
            background: 'var(--d-bg)',
            borderRadius: 10,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--d-muted)', marginBottom: 4 }}>Est. Earnings</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-accent)' }}>
              ${estimatedEarnings.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Parcel info */}
        <div style={{
          background: 'var(--d-bg)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, color: 'var(--d-muted)', marginBottom: 6 }}>Parcel</div>
          <div style={{ fontSize: 13, color: 'var(--d-ink)' }}>
            {order.parcel.size.toUpperCase()} • {order.parcel.desc}
            {order.parcel.fragile && ' • ⚠️ Fragile'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
        }}>
          <button
            onClick={onDecline}
            disabled={isExpired}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--d-surface)',
              border: '1.5px solid var(--d-border)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: isExpired ? 'var(--d-muted)' : 'var(--d-ink)',
              cursor: isExpired ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={isExpired}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: isExpired ? 'var(--d-muted)' : 'var(--d-accent)',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              cursor: isExpired ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isExpired ? 'Offer Expired' : 'Accept Job'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
