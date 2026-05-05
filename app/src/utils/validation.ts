import type { Draft } from '../types'
import { isValidPhone } from './format'

// ── Per-field error messages ──────────────────────────────────────────────────

export interface PickupErrors {
  address?: string
  name?: string
  phone?: string
}

export interface DropoffErrors {
  name?: string
  phone?: string
  address?: string
}

export function getPickupErrors(d: Draft): PickupErrors {
  const errs: PickupErrors = {}
  if (d.pickup.address.trim().length <= 3) errs.address = 'Enter a full pickup address.'
  if (!d.pickup.name.trim())               errs.name    = 'Enter the contact name.'
  if (!d.pickup.phone.trim())              errs.phone   = 'Enter a phone number.'
  else if (!isValidPhone(d.pickup.phone))  errs.phone   = 'Enter a valid Canadian phone number (e.g. 204 555 0100).'
  return errs
}

export function getDropoffErrors(d: Draft): DropoffErrors {
  const errs: DropoffErrors = {}
  if (!d.dropoff.name.trim())               errs.name    = "Enter the receiver's name."
  if (!d.dropoff.phone.trim())              errs.phone   = 'Enter a phone number.'
  else if (!isValidPhone(d.dropoff.phone))  errs.phone   = 'Enter a valid Canadian phone number (e.g. 204 555 0100).'
  if (d.dropoff.address.trim().length <= 3) errs.address = 'Enter a full drop-off address.'
  return errs
}

export function isPickupValid(d: Draft): boolean {
  return Object.keys(getPickupErrors(d)).length === 0
}

export function isDropoffValid(d: Draft): boolean {
  return Object.keys(getDropoffErrors(d)).length === 0
}

export function isParcelValid(d: Draft): boolean {
  return d.parcel.size !== undefined && d.parcel.prohibitedItemsDeclarationAccepted === true
}

export function isStepValid(step: 'new-1' | 'new-2' | 'new-3', d: Draft): boolean {
  if (step === 'new-1') return isPickupValid(d)
  if (step === 'new-2') return isDropoffValid(d)
  return isParcelValid(d)
}
