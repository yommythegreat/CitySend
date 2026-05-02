import type { Draft } from '../types'

export function isPickupValid(d: Draft): boolean {
  return d.pickup.address.trim().length > 3 &&
         d.pickup.name.trim().length > 0 &&
         d.pickup.phone.trim().length >= 7
}

export function isDropoffValid(d: Draft): boolean {
  return d.dropoff.name.trim().length > 0 &&
         d.dropoff.phone.trim().length >= 7 &&
         d.dropoff.address.trim().length > 3
}

export function isParcelValid(d: Draft): boolean {
  return d.parcel.size !== undefined
}

export function isStepValid(step: 'new-1' | 'new-2' | 'new-3', d: Draft): boolean {
  if (step === 'new-1') return isPickupValid(d)
  if (step === 'new-2') return isDropoffValid(d)
  return isParcelValid(d)
}
