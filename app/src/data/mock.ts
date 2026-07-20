import type { AppState, Draft } from '../types'

export const INITIAL_DRAFT: Draft = {
  pickup:  { address: '', unit: '', name: '', phone: '' },
  dropoff: { address: '', name: '', phone: '', note: '' },
  parcel:  { size: 'm', desc: '', fragile: false, prohibitedItemsDeclarationAccepted: false },
  deliveryWindow: 'morning',
}

export const BLANK_DRAFT: Draft = {
  pickup: { address: '', unit: '', name: '', phone: '' },
  dropoff: { address: '', name: '', phone: '', note: '' },
  parcel: { size: 'm', desc: '', fragile: false, prohibitedItemsDeclarationAccepted: false },
  deliveryWindow: 'morning',
}

export const INITIAL_STATE: AppState = {
  selectedCityId: 'winnipeg',
  savedAddresses:  [],
  paymentMethods:  [],
  pastDeliveries:  [],
}

