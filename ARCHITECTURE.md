# CitySend — System Architecture

## Overview

CitySend is a multi-app delivery platform composed of three front-end applications
sharing a common config, data models, and utility library.

```
City Send/
├── app/            Customer App    (React 18 + Vite, port 5173) — mobile-first
├── apps/
│   ├── admin/      Admin Console   (React 18 + Vite, port 5174) — desktop
│   └── driver/     Driver App      (React 18 + Vite, port 5175) — scaffold
└── shared/         Shared library  (types, config, utils, mock-data)
```

---

## Configuration Ownership Model

> **All pricing, city, tax, service-hour, delivery-rule, and availability
> configurations are admin-managed system configuration — not customer settings.**

Customers *read* configuration (to calculate prices, check availability, etc.).
Only the Admin Panel *writes* configuration.

### Roles

| App            | Config role        | Can call `setSystemCityConfigs`? |
|----------------|--------------------|----------------------------------|
| Admin Console  | Owner / writer     | ✅ Yes                           |
| Customer App   | Reader only        | ❌ No                            |
| Driver App     | Reader only        | ❌ No                            |

---

## Data Flow

### Current (MVP) — localStorage bridge

```
Admin Console
    │
    │  dispatch(UPDATE_CITY_CONFIG)
    │
    ▼
AdminContext.tsx
    │  useEffect → setSystemCityConfigs(state.cityConfigs)
    │
    ▼
localStorage['cs_city_configs_v1']   ← shared/utils/configStore.ts
    │
    │  StorageEvent (fires in same tab AND cross-tab)
    │
    ├──► Customer App (app/src/App.tsx)
    │        window.addEventListener('storage', ...)
    │        → setConfigVersion(v => v + 1)
    │        → useMemo re-derives cityConfig
    │        → all screens get updated pricing / availability
    │
    └──► Driver App (future)
             same storage-event pattern
```

Config is **session-persistent**: changes survive page refreshes but are lost
when localStorage is cleared. On first load (empty localStorage) all apps fall
back to the compile-time defaults in `shared/config/cityConfig.ts`.

### Intended Production Flow

```
Admin Console
    │
    │  dispatch(UPDATE_CITY_CONFIG)
    │
    ▼
Admin API   POST /api/admin/config/cities
    │
    ▼
Backend Database (Postgres / Firestore / etc.)
    │
    │  REST polling   OR   WebSocket push   OR   Server-Sent Events
    │
    ├──► Customer App
    └──► Driver App
```

Migration path:
1. Replace `setSystemCityConfigs(configs)` in `AdminContext.tsx` with an API call.
2. Replace `getSystemCityConfigs()` in both customer and driver apps with an API call
   (or a React Query / SWR hook backed by the API).
3. Remove the localStorage bridge (`configStore.ts`) once the API is stable.

---

## Shared Library (`shared/`)

```
shared/
├── config/
│   └── cityConfig.ts       CityConfig interface + CITY_CONFIGS default registry
├── types/
│   └── index.ts            All shared data models (Order, Driver, User, Receipt, …)
├── utils/
│   ├── configStore.ts      getSystemCityConfigs / setSystemCityConfigs (localStorage bridge)
│   ├── serviceAvailability.ts  City lookups + price computation (reads from configStore)
│   └── format.ts           Formatting helpers (fmt, fmtDate, relativeTime, …)
└── mock-data/
    ├── orders.ts            25 sample orders across all statuses
    ├── drivers.ts           8 sample drivers
    ├── users.ts             15 sample customers
    ├── receipts.ts          8 receipts for delivered orders
    └── index.ts             Barrel exports
```

### `@shared` alias

Admin and Driver apps resolve `@shared` → `../../shared` via Vite config:

```typescript
// apps/admin/vite.config.ts
resolve: { alias: { '@shared': path.resolve(__dirname, '../../shared') } }
```

The Customer App (`app/`) does **not** use this alias — it has its own copies of
`config/cityConfig.ts` and `utils/serviceAvailability.ts` for historical reasons.
A future cleanup task should consolidate them to use `@shared` directly.

---

## CityConfig Interface

Each market entry carries:

| Field               | Admin-editable | Purpose                                     |
|---------------------|---------------|---------------------------------------------|
| `isLive`            | ✅            | Gate — blocks customer orders when `false`  |
| `launchStatus`      | ✅            | `'live'` or `'coming-soon'` label           |
| `pricing`           | ✅            | Base fee, distance rate, package / fragile  |
| `taxRates`          | ✅            | GST / PST / HST / QST rates                 |
| `serviceHours`      | ✅            | Open/close times, timezone, active days     |
| `deliveryRules`     | ✅            | Weight/dimension limits, proof-of-delivery  |
| `cancellationRules` | ✅            | Free window, refund percentages             |
| `avgPickupMinutes`  | ✅            | Displayed in customer trust strip           |
| `onTimePercent`     | ✅            | Displayed in customer trust strip           |
| `geocodeBbox`       | ❌ (infra)    | Nominatim search bias bounding box          |
| `geocodeContext`    | ❌ (infra)    | City string appended to Nominatim queries   |
| `mapCenter`         | ❌ (infra)    | Leaflet map fallback centre `[lat, lng]`    |
| `detectionAliases`  | ❌ (infra)    | Geolocation reverse-lookup match strings    |
| `coverageNotes`     | ❌ (copy)     | Human-readable service area description     |

---

## Admin Console Screens

| Screen         | Path            | Description                                       |
|----------------|-----------------|---------------------------------------------------|
| Dashboard      | `'dashboard'`   | Stats overview, recent orders, driver status      |
| Orders         | `'orders'`      | Full order list + status pipeline management      |
| Drivers        | `'drivers'`     | Driver cards, assign / reassign, status view      |
| Customers      | `'customers'`   | Customer list + order history side panel          |
| Billing        | `'billing'`     | Receipt table, revenue KPIs                       |
| Configuration  | `'configuration'` | **Admin-managed config** (cities, pricing, tax, hours, delivery rules) |

---

## Auth

| App      | Mechanism                                          | Credentials (dev)                    |
|----------|----------------------------------------------------|--------------------------------------|
| Admin    | Email/password → `sessionStorage['cs_admin_auth']` | admin@citysend.ca / Admin123!        |
| Customer | Email/password → `localStorage['cs_token']`        | any valid-looking email + password   |
| Driver   | TBD (scaffold only)                                | —                                    |

---

## Running Locally

```bash
# Customer App (port 5173)
cd app && npm install && npm run dev

# Admin Console (port 5174)
cd apps/admin && npm install && npm run dev

# Driver App (port 5175) — scaffold only
cd apps/driver && npm install && npm run dev
```

---

## Key Design Rules

1. **No city names or prices in screen code.** Everything reads from `getCityConfig()`.
2. **Admin writes config; apps read it.** Only `AdminContext.tsx` calls `setSystemCityConfigs()`.
3. **`shared/` has no UI dependencies.** Pure TypeScript — importable by all apps.
4. **Customer app is never broken by admin changes.** `getSystemCityConfigs()` always falls back to compile-time defaults.
5. **Mock data is for development only.** All `MOCK_*` imports will be replaced by API calls in production.
