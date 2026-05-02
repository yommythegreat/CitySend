# CitySend City Configuration Guide

This document explains how the city-config architecture works, and how to perform
common tasks: adding a new city, activating one, adjusting pricing, and testing
city behaviour.

> **Architecture note:** Since the Admin-Managed Config update, all pricing, tax,
> service-hour, delivery-rule, and availability settings are treated as
> **admin-managed system configuration** — not static files.  The Admin Console
> (port 5174) is the single source of truth.  See [ARCHITECTURE.md](./ARCHITECTURE.md)
> for the full data-flow diagram.

---

## Where configuration lives

```
shared/
├── config/
│   └── cityConfig.ts           Compile-time defaults (CITY_CONFIGS array)
└── utils/
    ├── configStore.ts          localStorage bridge (getSystemCityConfigs / setSystemCityConfigs)
    └── serviceAvailability.ts  City lookups + price computation — always reads from configStore

app/src/
├── config/cityConfig.ts        Customer-app copy of compile-time defaults
└── utils/
    ├── configStore.ts          Customer-side reader (read-only; no setSystemCityConfigs)
    └── serviceAvailability.ts  Customer-app copy of availability utils

apps/admin/src/
└── store/AdminContext.tsx      Owns cityConfigs in state; syncs to localStorage on every change
```

**Rule for screens:** Never import from `cityConfig.ts` directly. Always use
`getCityConfig()` / `computeOrderPrice()` from `serviceAvailability.ts`. Those
functions call `getSystemCityConfigs()` which returns admin overrides first.

---

## How to add a new city

### Step 1 — Extend the `CityId` union

In **both** `shared/types/index.ts` and `app/src/types/index.ts`, add the slug:

```typescript
export type CityId =
  | 'winnipeg'
  | 'toronto'
  // ... existing cities ...
  | 'halifax'   // ← add here
```

Use lowercase, hyphen-separated slugs (`'saint-john'`, not `'saintJohn'`).

### Step 2 — Add a `CityConfig` entry

Add the entry to **both** `shared/config/cityConfig.ts` **and**
`app/src/config/cityConfig.ts`:

```typescript
{
  cityId: 'halifax',
  cityName: 'Halifax',
  province: 'Nova Scotia',
  country: 'Canada',
  isLive: false,
  launchStatus: 'coming-soon',
  serviceHours: {
    open: '08:00', close: '22:00',
    timezone: 'America/Halifax',
    daysActive: ALL_WEEKDAYS,
  },
  pricing: PLACEHOLDER_PRICING,
  taxRates: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
  supportedPackageSizes: ['s', 'm', 'l'],
  deliveryRules: DEFAULT_RULES,
  cancellationRules: DEFAULT_CANCELLATION,
  coverageNotes: 'Planned coverage across HRM (Halifax, Dartmouth, Bedford).',
  detectionAliases: ['halifax', 'dartmouth'],
  geocodeBbox:    '-63.75,44.55,-63.45,44.75',
  geocodeContext: 'Halifax, NS, Canada',
  mapCenter:      [44.6488, -63.5752],
  avgPickupMinutes: 15,
  onTimePercent:    '—',
}
```

**Tax reference:**

| Province / territory | Tax setup   | Rates                              |
|----------------------|-------------|------------------------------------|
| Manitoba             | GST + PST   | gst: 0.05, pst: 0.07               |
| Alberta              | GST only    | gst: 0.05                          |
| British Columbia     | GST + PST   | gst: 0.05, pst: 0.07               |
| Ontario              | HST         | hst: 0.13                          |
| Quebec               | GST + QST   | gst: 0.05, qst: 0.09975            |
| Nova Scotia          | HST         | hst: 0.15                          |
| New Brunswick        | HST         | hst: 0.15                          |
| Saskatchewan         | GST + PST   | gst: 0.05, pst: 0.06               |
| PEI                  | HST         | hst: 0.15                          |

### Step 3 — Done

The new city will appear in:
- Admin Console → Configuration → City Management
- Customer App city picker (grey dot, "Coming soon" badge)
- CityBlockedScreen "Also launching soon" chips

---

## How to activate a city (go live)

**Preferred path (runtime):** Admin Console → Configuration → Cities →
click the city's "Coming Soon" toggle → it flips to "Live" immediately.
All customer apps in the same browser session update within milliseconds.

**Compile-time path (deploy-time):** Edit `CITY_CONFIGS` in both
`shared/config/cityConfig.ts` and `app/src/config/cityConfig.ts`:

```typescript
// Before
isLive: false,
launchStatus: 'coming-soon',
pricing: PLACEHOLDER_PRICING,

// After
isLive: true,
launchStatus: 'live',
pricing: {
  baseFee: 15.00,
  baseDistanceKm: 10,
  extraKmFee: 1.75,
  smallPackageFee: 0,
  mediumPackageFee: 2.00,
  largePackageFee: 4.00,
  fragileFee: 2.00,
  currency: 'CAD',
},
```

> **Never** set `isLive: true` while `pricing` is still `PLACEHOLDER_PRICING`.

---

## How to change pricing

**Preferred path:** Admin Console → Configuration → Pricing → select city → edit fields → Save Changes.

Changes take effect immediately. The Customer App picks them up via the localStorage
`storage` event and re-renders the pricing screen without a page reload.

**Compile-time path:** Edit the `pricing` block in `CITY_CONFIGS` in both
`shared/config/cityConfig.ts` and `app/src/config/cityConfig.ts`.

### Price formula

```
distanceFee    = max(0, (distKm − baseDistanceKm) × extraKmFee)
sizeFee        = smallPackageFee | mediumPackageFee | largePackageFee
fragileFee     = fragileFee  (if fragile, else 0)
subtotalPreTax = baseFee + distanceFee + sizeFee + fragileFee
taxes          = subtotalPreTax × (gst + pst + hst + qst)
subtotalWithTax = subtotalPreTax + taxes
total          = subtotalWithTax + tip   ← tip is never taxed
```

---

## How to change tax rates

**Preferred path:** Admin Console → Configuration → Tax Rates → click "Edit" on the city row.

**Compile-time path:** Edit the `taxRates` block in the city's `CityConfig` entry in both config files.

---

## How to change service hours / delivery rules / cancellation policy

Admin Console → Configuration → Service Hours (or Delivery Rules) → select city → edit → Save.

---

## How city availability affects ordering

```
User taps "Send a package"
  │
  ▼
App.tsx  go('new-1')
  │
  ├─ canStartOrder(selectedCityId) === true   → order flow (new-1)
  └─ canStartOrder(selectedCityId) === false  → CityBlockedScreen
```

`canStartOrder()` reads from `getSystemCityConfigs()` so admin live/coming-soon
toggles are reflected instantly.

---

## Testing

### Manual

1. Start both apps: `cd app && npm run dev` (port 5173) and `cd apps/admin && npm run dev` (port 5174).
2. In the Admin Console, go to Configuration → Cities and toggle a city off/on.
3. In the Customer App, observe the city picker dot and CTA button update immediately.
4. In the Admin Console, go to Configuration → Pricing and raise the base fee by $1.
5. In the Customer App, go through the order flow and verify the new price on PricingScreen.

### Automated (future)

`computeOrderPrice()` is a pure function and straightforward to unit-test:

```typescript
import { computeOrderPrice, getCityConfig } from '@shared/utils/serviceAvailability'

test('winnipeg medium parcel within base distance', () => {
  const p = computeOrderPrice({
    cityConfig: getCityConfig('winnipeg'),
    distKm: 5, parcelSize: 'm', fragile: false, tip: 0,
  })
  expect(p.baseFee).toBe(14.00)
  expect(p.sizeFee).toBe(2.00)
  expect(p.gst).toBe(0.80)          // 16 × 0.05
  expect(p.pst).toBe(1.12)          // 16 × 0.07
  expect(p.subtotalWithTax).toBe(17.92)
})
```

---

## File reference

| File | Purpose |
|------|---------|
| `shared/config/cityConfig.ts` | Compile-time city registry (canonical defaults) |
| `shared/utils/configStore.ts` | localStorage bridge — `get` and `set` for all apps |
| `shared/utils/serviceAvailability.ts` | City lookups + price computation (reads from configStore) |
| `app/src/config/cityConfig.ts` | Customer-app copy of compile-time defaults |
| `app/src/utils/configStore.ts` | Customer-app reader (no write access) |
| `app/src/utils/serviceAvailability.ts` | Customer-app copy of availability utils |
| `apps/admin/src/store/AdminContext.tsx` | Owns `cityConfigs` state; writes to configStore on change |
| `apps/admin/src/screens/ConfigurationScreen.tsx` | Admin UI for all config sections |
| `app/src/App.tsx` | Listens for `storage` event; re-derives `cityConfig` via `configVersion` |
