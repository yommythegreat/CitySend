/**
 * Pricing utilities — compatibility shim.
 *
 * Core pricing logic now lives in utils/serviceAvailability.ts.
 * `calcPrice` is kept here for PaymentScreen which doesn't receive
 * a city config prop (it's a confirmation step, not a pricing step).
 * New code should import `computeOrderPrice` from serviceAvailability.
 */

import { computeOrderPrice, getCityConfig } from './serviceAvailability'

// Re-export the canonical breakdown type so consumers don't break.
export type { PriceBreakdown } from './serviceAvailability'

/** Format a number as a "$XX.XX" string. */
export function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}

/**
 * @deprecated Use computeOrderPrice() with a CityConfig instead.
 *
 * Compatibility wrapper: computes price using the Winnipeg config with
 * medium parcel, no fragile surcharge, and no distance surcharge.
 * PaymentScreen uses this because it doesn't receive draft/cityConfig props.
 */
export function calcPrice(tip = 0) {
  const winnipeg = getCityConfig('winnipeg')
  const p = computeOrderPrice({
    cityConfig: winnipeg,
    distKm: 0,
    parcelSize: 'm',
    fragile: false,
    tip,
  })
  return {
    base:     p.baseFee,
    gst:      p.gst,
    pst:      p.pst,
    subtotal: p.subtotalWithTax,
    tip:      p.tip,
    total:    p.total,
  }
}
