import type { AppState, Draft } from '../types'

export const INITIAL_DRAFT: Draft = {
  pickup: {
    address: '134 Princess St, Exchange District',
    unit: '',
    name: 'Sasha Novak',
    phone: '204 555 0199',
  },
  dropoff: {
    address: '88 Osborne St, Osborne Village',
    name: 'Mei Tanaka',
    phone: '204 555 0148',
    note: 'Leave at the front desk',
  },
  parcel: { size: 'm', desc: 'Birthday cake — chocolate', fragile: true },
}

export const BLANK_DRAFT: Draft = {
  pickup: { address: '', unit: '', name: '', phone: '' },
  dropoff: { address: '', name: '', phone: '', note: '' },
  parcel: { size: 'm', desc: '', fragile: false },
}

export const INITIAL_STATE: AppState = {
  selectedCityId: 'winnipeg',
  savedAddresses: [
    { label: 'Home',   address: '134 Princess St, Winnipeg MB', icon: 'home' },
    { label: 'Studio', address: '245 McDermot Ave #301',        icon: 'package' },
    { label: "Mom's",  address: '1220 Grosvenor Ave',           icon: 'pin' },
  ],
  paymentMethods: [
    { id: 'pm_1', brand: 'visa',       last4: '4242', expiry: '12/27', isDefault: true  },
    { id: 'pm_2', brand: 'mastercard', last4: '5555', expiry: '08/26', isDefault: false },
  ],
  pastDeliveries: [
    {
      id: '2810',
      to: { name: 'Mei Tanaka',        address: '88 Osborne St, Osborne Village',   phone: '204 555 0148' },
      date: 'Apr 28', price: '17.68', status: 'in-transit', when: 'Today',
    },
    {
      id: '2788',
      to: { name: 'J. Morissette',     address: '412 Academy Rd, River Heights' },
      date: 'Apr 22', price: '15.68', status: 'delivered',  when: 'Yesterday',
    },
    {
      id: '2745',
      to: { name: 'The Forks Market',  address: '1 Forks Market Rd' },
      date: 'Apr 19', price: '15.68', status: 'delivered',  when: 'Fri',
    },
    {
      id: '2712',
      to: { name: 'Prairie Ink Books', address: '1120 Grant Ave, Grant Park' },
      date: 'Apr 15', price: '15.68', status: 'delivered',  when: 'Apr 15',
    },
    {
      id: '2698',
      to: { name: 'Bodegoes (Polo Park)', address: '1485 Portage Ave' },
      date: 'Apr 12', price: '15.68', status: 'canceled',   when: 'Apr 12',
    },
  ],
}

export const MOCK_COURIER = {
  name:    'Armen Y.',
  initials:'AY',
  rating:  '4.96',
  vehicle: 'Toyota Corolla',
  plate:   'MFJ 4K2',
}
