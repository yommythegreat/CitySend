# CitySend Driver App — Scaffold

**Status:** Structure prepared. Not yet built.

**Planned port:** 5175

## What this app will do

The driver app is the mobile-first interface for CitySend couriers. It will:

1. Allow drivers to log in with their driver account
2. See available orders near them
3. Accept / reject order assignments
4. Navigate to pickup and drop-off addresses (map integration)
5. Mark orders as Picked Up → In Transit → Delivered
6. View their earnings and completed trip history

## Folder structure (planned)

```
apps/driver/
  src/
    App.tsx
    screens/
      LoginScreen.tsx
      AvailableOrdersScreen.tsx
      ActiveDeliveryScreen.tsx
      EarningsScreen.tsx
    components/
      OrderCard.tsx
      MapView.tsx
      StatusButton.tsx
    store/
      DriverContext.tsx
```

## Shared imports

Will import from `@shared`:
- `@shared/types` — Order, Driver, OrderStatus
- `@shared/utils/serviceAvailability` — getCityConfig, canStartOrder
- `@shared/utils/format` — fmt, fmtDateTime
- `@shared/mock-data` — MOCK_ORDERS, MOCK_DRIVERS (for dev)

## Key differences from customer app

- Driver POV: pickup → deliver (no order creation)
- Real-time position updates (will use browser geolocation)
- Accepts/rejects order assignments from admin
- No pricing UI (driver sees order details only)
- Mobile-first (same form factor as customer app)

## To build

1. `npm install` in this directory
2. Create `vite.config.ts` aliasing `@shared` → `../../shared`
3. Create `tsconfig.json` mirroring admin app config
4. Build the screens listed above
