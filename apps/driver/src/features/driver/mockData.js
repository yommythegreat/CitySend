export const driver = {
  id: 'drv_armen_y',
  name: 'Armen Y.',
  todayEarnings: 184,
  todayJobs: 11,
  hoursOnline: 4.2,
  kilometersDriven: 26,
};

export const currentOffer = {
  id: 'CS-2810',
  service: 'Standard',
  payout: 11.2,
  totalFare: 14,
  distanceKm: 3.2,
  etaMinutes: 22,
  pickupEtaMinutes: 4,
  pickup: {
    name: 'Sasha Novak',
    address: '134 Princess St',
    unit: 'Apt 4B',
    neighborhood: 'Exchange District',
    phone: '204 555 0199',
  },
  dropoff: {
    name: 'Mei Tanaka',
    address: '88 Osborne St',
    unit: 'Apt 3',
    neighborhood: 'Osborne Village',
    phone: '204 555 0148',
    note: 'Leave at the front desk. Building staff will hold it.',
  },
  parcel: {
    size: 'Medium',
    weight: '4 lb',
    description: 'Birthday cake - chocolate',
    handling: ['Fragile', 'Keep upright'],
  },
};

export const hotspots = [
  { area: 'Exchange District', level: 'High', wait: '< 3 min', demand: 0.95 },
  { area: 'Osborne Village', level: 'Steady', wait: '~ 8 min', demand: 0.66 },
  { area: 'Polo Park', level: 'Quiet', wait: '~ 18 min', demand: 0.34 },
];
