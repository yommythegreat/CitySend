/**
 * Stable identifier for every CitySend market.
 * Must stay in sync with CITY_CONFIGS in src/config/cityConfig.ts.
 * Add a new value here when registering a new city.
 */
export type CityId =
  | 'winnipeg'
  | 'toronto'
  | 'calgary'
  | 'vancouver'
  | 'edmonton'
  | 'ottawa'
  | 'montreal'

export type ScreenName =
  | 'landing'
  | 'auth'
  | 'forgot-password'
  | 'home'
  | 'new-1'
  | 'new-2'
  | 'new-3'
  | 'pricing'
  | 'pay'
  | 'tracking'
  | 'history'
  | 'billing'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'add-place'
  | 'city-blocked'

export interface SavedAddress {
  label:   string
  address: string
  icon:    'home' | 'package' | 'pin'
  /** Optional extra fields captured when saving the place */
  unit?:   string
  name?:   string
  phone?:  string
}

export interface Delivery {
  id: string
  to: { name: string; address: string; phone?: string }
  from?: { name: string; address: string; phone?: string }
  date: string
  price: string
  status: 'delivered' | 'in-transit' | 'canceled'
  when: string
}

export interface PickupDraft {
  address: string
  unit: string
  name: string
  phone: string
  lat?: number
  lng?: number
}

export interface DropoffDraft {
  address: string
  name: string
  phone: string
  note: string
  lat?: number
  lng?: number
}

export interface ParcelDraft {
  size: 's' | 'm' | 'l'
  desc: string
  fragile: boolean
  prohibitedItemsDeclarationAccepted: boolean
  prohibitedItemsDeclarationAcceptedAt?: string
}

export interface RouteInfo {
  distanceM: number
  durationS: number
  coords: [number, number][]  // [lat, lng] pairs for Leaflet
}

export interface Draft {
  pickup: PickupDraft
  dropoff: DropoffDraft
  parcel: ParcelDraft
  route?: RouteInfo
}

export interface PaymentMethod {
  id: string
  brand: 'visa' | 'mastercard' | 'amex'
  last4: string
  expiry: string
  isDefault: boolean
}

export interface AppState {
  /** The city the user is currently operating in. Drives pricing, availability, and UI. */
  selectedCityId: CityId
  savedAddresses: SavedAddress[]
  pastDeliveries: Delivery[]
  paymentMethods: PaymentMethod[]
}

export interface AuthUser {
  id: string
  email: string
  name: string
  phone?: string
}

export interface NavOptions {
  prefill?: Delivery
  /** Pass when navigating to 'tracking' to track a specific order */
  trackOrderId?: string
}
