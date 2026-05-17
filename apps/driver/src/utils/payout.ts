import type { Order } from '@shared/types'

/** 80 % of the pre-tax delivery subtotal + full tip */
export const DRIVER_COMMISSION = 0.80

export function driverPayout(order: Order): number {
  const b = order.priceBreakdown
  return b.subtotalPreTax * DRIVER_COMMISSION + b.tip
}
