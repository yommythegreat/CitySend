import React from 'react'
import type { OrderStatus, DriverStatus } from '@shared/types'

const ORDER_LABELS: Record<OrderStatus, string> = {
  scheduled:  'Scheduled',
  preparing:  'Preparing',
  new:        'New',
  offered:    'Pending Accept',
  assigned:   'Assigned',
  picked_up:  'Picked Up',
  in_transit: 'In Transit',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

const ORDER_DOTS: Record<OrderStatus, string> = {
  scheduled:  '○',
  preparing:  '○',
  new:        '○',
  offered:    '○',
  assigned:   '○',
  picked_up:  '◐',
  in_transit: '◑',
  delivered:  '●',
  cancelled:  '×',
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`d-badge d-badge-${status}`}>
      {ORDER_DOTS[status]} {ORDER_LABELS[status]}
    </span>
  )
}

export function DriverStatusPill({ status }: { status: DriverStatus }) {
  return (
    <span className={`d-badge d-badge-${status}`}>
      {status === 'available' ? '● Available' :
       status === 'busy'      ? '● On Delivery' :
                                '○ Offline'}
    </span>
  )
}
