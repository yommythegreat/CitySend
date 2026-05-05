import type { AppState, Draft } from '../types'

export const INITIAL_DRAFT: Draft = {
  pickup:  { address: '', unit: '', name: '', phone: '' },
  dropoff: { address: '', name: '', phone: '', note: '' },
  parcel:  { size: 'm', desc: '', fragile: false, prohibitedItemsDeclarationAccepted: false },
}

export const BLANK_DRAFT: Draft = {
  pickup: { address: '', unit: '', name: '', phone: '' },
  dropoff: { address: '', name: '', phone: '', note: '' },
  parcel: { size: 'm', desc: '', fragile: false, prohibitedItemsDeclarationAccepted: false },
}

export const INITIAL_STATE: AppState = {
  selectedCityId: 'winnipeg',
  savedAddresses:  [],
  paymentMethods:  [],
  pastDeliveries:  [],
}

export const MOCK_COURIER = {
  name:    'Armen Y.',
  initials:'AY',
  rating:  '4.96',
  vehicle: 'Toyota Corolla',
  plate:   'MFJ 4K2',
}
