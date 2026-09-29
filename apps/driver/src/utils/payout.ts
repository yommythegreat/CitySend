import type { Order } from '@shared/types'

/** 80 % of the pre-tax delivery subtotal + full tip */
export const DRIVER_COMMISSION = 0.80

export function driverPayout(order: Order): number {
  const b = order.priceBreakdown
  return b.subtotalPreTax * DRIVER_COMMISSION + b.tip
}

/** What the driver earns on an order, split the way drivers think about it. */
export function payoutBreakdown(order: Order) {
  const fare  = order.priceBreakdown.subtotalPreTax
  const share = fare * DRIVER_COMMISSION
  const tip   = order.priceBreakdown.tip
  return { fare, share, tip, total: share + tip, sharePct: Math.round(DRIVER_COMMISSION * 100) }
}
