import React from 'react'
import type { OrderStatus, DriverStatus } from '@shared/types'
import { ORDER_STATUS_LABELS, DRIVER_STATUS_LABELS } from '@shared/types'

const ORDER_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  new:        { bg: 'var(--a-info-bg)',   color: 'var(--a-info)'   },
  assigned:   { bg: 'var(--a-warn-bg)',   color: 'var(--a-warn)'   },
  picked_up:  { bg: 'var(--a-orange-bg)', color: 'var(--a-orange)' },
  in_transit: { bg: 'var(--a-purple-bg)', color: 'var(--a-purple)' },
  delivered:  { bg: 'var(--a-ok-bg)',     color: 'var(--a-ok)'     },
  cancelled:  { bg: '#f3f4f6',            color: 'var(--a-muted)'  },
}

const DRIVER_COLORS: Record<DriverStatus, { bg: string; color: string }> = {
  available: { bg: 'var(--a-ok-bg)',   color: 'var(--a-ok)'   },
  busy:      { bg: 'var(--a-warn-bg)', color: 'var(--a-warn)' },
  offline:   { bg: '#f3f4f6',          color: 'var(--a-muted)'},
  suspended: { bg: 'var(--a-err-bg)',  color: 'var(--a-err)'  },
}

interface OrderBadgeProps  { status: OrderStatus;  size?: 'sm' | 'md' }
interface DriverBadgeProps { status: DriverStatus; size?: 'sm' | 'md' }

function Badge({ label, bg, color, size = 'md' }: { label: string; bg: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
      borderRadius: 999,
      background: bg, color,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

export function OrderStatusBadge({ status, size }: OrderBadgeProps) {
  const c = ORDER_COLORS[status]
  return <Badge label={ORDER_STATUS_LABELS[status]} bg={c.bg} color={c.color} size={size} />
}

export function DriverStatusBadge({ status, size }: DriverBadgeProps) {
  const c = DRIVER_COLORS[status]
  return <Badge label={DRIVER_STATUS_LABELS[status]} bg={c.bg} color={c.color} size={size} />
}
