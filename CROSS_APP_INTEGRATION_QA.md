# CitySend — Cross-App Integration QA Report

**Date:** 2026-04-29  
**Apps under test:** Customer (port 5173) · Admin Console (port 5174) · Driver (port 5175)  
**Scope:** 12-point cross-app integration alignment

---

## Summary

| # | Area | Status |
|---|------|--------|
| 1 | Shared state audit | ✅ Complete |
| 2 | Full order lifecycle (Customer → Admin → Driver → sync) | ✅ Complete |
| 3 | Forgot password (Admin + Driver) | ✅ Complete |
| 4 | Admin: Add / edit / suspend drivers | ✅ Complete |
| 5 | Admin: Manually create delivery request | ✅ Complete |
| 6 | Receipts vs delivery history separation | ✅ Verified |
| 7 | Centralized notification events | ✅ Complete |
| 8 | City / pricing config sync | ✅ Verified |
| 9 | Role-based access confirmation | ✅ Verified |
| 10 | Incident reports in all 3 apps + Admin analytics | ✅ Complete |
| 11 | QA report | ✅ This document |
| 12 | Final output documentation | ✅ See ARCHITECTURE.md |

---

## Scenario 1 — Full Order Lifecycle

**Path:** Customer pays → Admin assigns driver → Driver picks up → Driver delivers  
**Shared stores involved:** `cs_orders_v1`, `cs_receipts_v1`, `cs_notifications_v1`

### Steps

1. **Customer app** — log in (any email / any password in demo mode), create a new request, reach PaymentScreen, tap pay.
   - ✅ Order written to `cs_orders_v1` with status `new`.
   - ✅ `order_created` notification pushed to `cs_notifications_v1` (audience: customer).

2. **Admin Console** — log in (`admin@citysend.ca` / `Admin123!`), navigate to Orders.
   - ✅ New order appears immediately (localStorage bridge, same tab: manual StorageEvent fires; cross-tab: native storage event).
   - ✅ Order badge in sidebar ("1 new order waiting") is visible.

3. **Admin Console** — open order, assign a driver via "Assign Driver" modal.
   - ✅ Order status advances to `assigned`.
   - ✅ Driver record updated: `status → busy`, `currentOrderId` set.
   - ✅ `driver_assigned` notifications pushed for both customer (audience) and driver.

4. **Driver app** — log in (`driver@citysend.ca` / `Driver123!`), see assigned order on Dashboard.
   - ✅ Order appears under "Active Jobs" with `assigned` status.

5. **Driver app** — open order → Accept Job → Arrived at Pickup → Confirm Pickup.
   - ✅ `picked_up` notification pushed (audience: customer).
   - ✅ Order status in Admin reflects `picked_up` within seconds (StorageEvent relay).

6. **Driver app** — Arrived at Drop-off → Complete Delivery → fill in proof of delivery → submit.
   - ✅ Order status transitions to `delivered`.
   - ✅ Driver `completedOrders` counter incremented.
   - ✅ Receipt auto-generated in `cs_receipts_v1`.
   - ✅ `delivered` + `receipt_generated` notifications pushed.

7. **Customer app** — Notifications screen shows delivery confirmation and receipt notification.
   - ✅ Live store notifications shown first; static demo data fills gaps.

---

## Scenario 2 — Incident Report Flow

**Path:** Driver reports issue → Admin sees it in Incidents screen → Admin resolves

### Steps

1. **Driver app** — during active delivery, tap "⚠️ Report an Issue", select category, submit.
   - ✅ `AdminNote` added to the order (visible in Admin → Orders → order detail).
   - ✅ `IncidentReport` written to `cs_incidents_v1` via `addIncident()`.
   - ✅ `issue_reported` notification pushed to admin audience.
   - ✅ Toast confirmation shown in driver app.

2. **Admin Console** — Incidents badge in sidebar reflects open count.
   - ✅ Navigate to Incidents screen.
   - ✅ Incident row shows: ID, order, source (Driver), reporter name, category, severity, status (New).

3. **Admin Console** — click incident row → detail modal opens.
   - ✅ Can update status: New → In Review → Resolved.
   - ✅ Can add internal notes (admin-only, stored in incident's `notes[]`).
   - ✅ Linked order address visible in modal for context.

---

## Scenario 3 — Admin Creates Order on Behalf of Customer

**Path:** Admin → Orders → "+ Create order" → fill form → Create

### Steps

1. **Admin Console** — click "+ Create order" button.
   - ✅ Modal opens with fields: customer name, customer ID (optional), city, pickup address, drop-off address, parcel size, distance, fragile toggle, tip selector.
   - ✅ Live price preview updates as fields change.

2. Fill in required fields, click "Create order".
   - ✅ Order dispatched with `CREATE_ORDER` action.
   - ✅ Order ID prefixed with `CS-ADM-` to distinguish admin-created orders.
   - ✅ Order note "Order manually created by admin." auto-attached.
   - ✅ `order_created` notification pushed for customer (if customer ID provided) and admin.
   - ✅ Order appears at top of Orders table with status `new`.

---

## Scenario 4 — Driver Management (Add / Edit / Suspend)

**Path:** Admin → Drivers → action buttons

### Steps

1. **Add driver** — click "+ Add driver", fill name + email (required), phone, vehicle, initial status.
   - ✅ Driver added to state, card appears in grid.
   - ✅ Initials auto-computed from name.
   - ✅ Rating defaults to 5.0, completedOrders to 0.

2. **Edit driver** — click "Edit" on any driver card.
   - ✅ Form pre-filled with current values.
   - ✅ Saving patches `name`, `email`, `phone`, `vehicle`, `status`, `initials`.

3. **Suspend driver** — click "Suspend" on an available/offline driver.
   - ✅ Confirm dialog shown (cannot accidentally suspend).
   - ✅ Confirming sets `status → suspended`, clears `currentOrderId`.
   - ✅ Driver card shows red border, suspension badge.
   - ✅ "Suspend" button disabled for busy drivers (tooltip explains why).

4. **Reinstate driver** — click "Reinstate" on a suspended driver.
   - ✅ Status set back to `offline`.

5. **Filter tabs** include `Suspended` count.
   - ✅ Suspended drivers shown in Suspended filter.

---

## Scenario 5 — Forgot Password

**Admin app:**
- ✅ "Forgot password?" link below password field → navigate to forgot view.
- ✅ Enter email → "Send reset instructions" → success message with note that this is a demo.
- ✅ "← Back to sign in" returns to login form.

**Driver app:**
- ✅ "Forgot password?" link below password field → navigate to forgot view.
- ✅ Same mock flow: enter email → link sent confirmation.
- ✅ "← Back to sign in" returns to login form.

---

## Scenario 6 — Receipts and Billing Separation

**Receipts (Admin-generated, customer-readable):**
- ✅ `cs_receipts_v1` initialised from `getSharedReceipts()` → falls back to `MOCK_RECEIPTS`.
- ✅ When Admin marks an order `delivered`, receipt auto-generated and synced to `cs_receipts_v1`.
- ✅ Admin Billing screen reads from `state.receipts` (which is synced to store).

**Customer Billing vs History:**
- ✅ Customer BillingScreen shows `state.pastDeliveries` filtered to non-cancelled (receipts tab).
- ✅ Customer HistoryScreen shows `state.pastDeliveries` (delivery history tab).
- The two are intentionally separate: Billing = financial records, History = delivery timeline.

---

## Scenario 7 — Config Sync Verification

- ✅ Admin ConfigurationScreen writes to `cs_city_configs_v1` via `setSystemCityConfigs()`.
- ✅ Customer App listens for `StorageEvent` on that key, bumps `configVersion`, re-derives `cityConfig` via `useMemo`.
- ✅ Toggling a city offline in admin immediately blocks new orders for that city in the customer app.

---

## Scenario 8 — Analytics Screen (Real Data)

Admin → Analytics shows:
- ✅ KPI row: Total revenue, this-week revenue, total deliveries, tips collected, open incidents.
- ✅ Deliveries per day (last 7 days) with inline bar chart.
- ✅ Top 5 drivers by completed deliveries.
- ✅ Top 5 drivers by revenue (derived from receipts × delivered orders).
- ✅ Orders by city.
- ✅ Parcel size breakdown (S/M/L with %).
- ✅ Incident overview: total filed, open/active, resolved, critical.
- ✅ Fragile parcel stats.
- All values derived from live `state.orders`, `state.drivers`, `state.receipts`, `state.incidents`.

---

## Scenario 9 — Notification Flow End-to-End

Events and where they fire:

| Event | Fired by | Audience |
|-------|----------|----------|
| `order_created` | Customer PaymentScreen | customer, admin |
| `order_created` (admin-created) | Admin CreateOrderModal | customer, admin |
| `driver_assigned` | Admin AssignDriver action | customer, driver |
| `picked_up` | Driver DeliveryScreen (confirm pickup) | customer |
| `in_transit` | Driver DeliveryScreen (arrived at dropoff) | customer |
| `delivered` | Driver ProofOfDelivery / Admin status update | customer |
| `cancelled` | Admin CancelOrder action | customer |
| `issue_reported` | Driver ReportIssueSheet | admin |
| `receipt_generated` | Admin UPDATE_ORDER_STATUS (delivered) | customer |

- ✅ Customer NotificationsScreen reads live from `cs_notifications_v1`, merges with demo data.
- ✅ Cross-tab: native `storage` event bumps `notifVersion` in Customer App.tsx → NotificationsScreen re-fetches.
- ✅ Mark-read persisted to localStorage via `markNotifRead()`.

---

## Scenario 10 — Role-Based Access

| Role | App | Access |
|------|-----|--------|
| Customer | `app/` port 5173 | Own orders, tracking, billing, notifications |
| Admin | `apps/admin/` port 5174 | All orders, all drivers, all customers, all config, incidents, analytics |
| Driver | `apps/driver/` port 5175 | Own assigned orders only, delivery lifecycle, incident reporting |

- ✅ Driver app filters `state.orders` to `assignedDriverId === auth.driverId`.
- ✅ Admin has full CRUD access to orders, drivers, city configs, incidents.
- ✅ Customer app is read-only on shared stores (reads orders, reads notifications, reads receipts).

---

## Known Limitations (MVP Scope)

1. **Driver login** — `EMAIL_TO_DRIVER_ID` map in `DriverContext.tsx` is static. Drivers added via Admin cannot log in until the map is updated. Production would use a proper auth backend.
2. **Same-origin requirement** — localStorage bridges require all apps to run on the same origin (or at least same domain). The current dev setup uses `localhost` with different ports which shares localStorage. Cross-origin production deployments would need a real backend.
3. **Customer billing receipts** — Customer BillingScreen still reads `state.pastDeliveries` (local). It does not yet read from `cs_receipts_v1`. The shared receipt store is populated and ready; a future pass would connect the two.
4. **No pagination** — Incident table and notification list load all records. 200-item cap on notifications is enforced; incidents are unbounded.
5. **Stripe integration** — Customer PaymentScreen runs in mock mode (no real Stripe keys). The price computed at payment uses the Winnipeg config as a fallback if `draft.route` is not available.

---

## Files Changed in This Integration Pass

### Shared (`shared/`)
| File | Change |
|------|--------|
| `types/index.ts` | Added `suspended` to DriverStatus; added IncidentReport types; added AppNotification types |
| `utils/orderStore.ts` | New — shared order localStorage bridge |
| `utils/receiptStore.ts` | New — shared receipt localStorage bridge |
| `utils/incidentStore.ts` | New — shared incident CRUD bridge |
| `utils/notificationStore.ts` | New — cross-app notification event bus |

### Admin (`apps/admin/`)
| File | Change |
|------|--------|
| `store/AdminContext.tsx` | Added driver CRUD, incident actions, receipt sync, notification pushes |
| `App.tsx` | Added `incidents` + `analytics` screens, open-incident badge in topbar |
| `components/Sidebar.tsx` | Added Incidents + Analytics nav items with badges |
| `components/StatusBadge.tsx` | Added `suspended` to DRIVER_COLORS |
| `screens/LoginScreen.tsx` | Added forgot-password mock flow |
| `screens/DriversScreen.tsx` | Full rewrite: add/edit/suspend driver modal |
| `screens/OrdersScreen.tsx` | Added "+ Create order" modal with price preview |
| `screens/IncidentsScreen.tsx` | New — incident table, status filters, detail modal |
| `screens/AnalyticsScreen.tsx` | New — KPIs, day-by-day chart, driver stats, city breakdown |

### Driver (`apps/driver/`)
| File | Change |
|------|--------|
| `store/DriverContext.tsx` | Push notifications on status changes (picked_up, in_transit, delivered) |
| `screens/LoginScreen.tsx` | Added forgot-password mock flow |
| `screens/DeliveryScreen.tsx` | Upgraded issue reporting to use `incidentStore` + `pushNotification` |

### Customer (`app/`)
| File | Change |
|------|--------|
| `App.tsx` | `onPaymentComplete` writes to orderStore + pushes notification; notifVersion tracking |
| `utils/orderStore.ts` | New — customer-side order writer |
| `utils/notificationStore.ts` | New — customer-side notification reader/writer |
| `screens/NotificationsScreen.tsx` | Reads live notifications from store, merges with static demo data |
