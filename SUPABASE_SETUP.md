# CitySend — Supabase Backend Setup

## Overview

CitySend has been migrated from a localStorage-only system to a real Supabase backend.  
All three apps share a single Supabase project.

**Fallback behaviour:** if `.env` files are not configured, every app automatically falls back to the original localStorage bridges — so the apps still work for local dev without any Supabase setup.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Choose a region closest to your users
3. Save the database password — you'll need it for the CLI

---

## 2. Run the Schema Migration

Open the **Supabase Dashboard → SQL Editor** and run both files in order:

```
supabase/migrations/001_citysend_schema.sql   ← tables, RLS, realtime
supabase/seed.sql                              ← drivers, sample orders, city configs
```

Or using the Supabase CLI:

```bash
# Install CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Push schema
supabase db push

# Run seed manually via SQL editor (seed.sql is not a migration)
```

---

## 3. Create Auth Users

Go to **Supabase Dashboard → Authentication → Users → Invite user**  
(or use the SQL below after enabling email confirmations are turned off in Auth settings)

### Required accounts

| App | Email | Password | Role metadata |
|-----|-------|----------|---------------|
| Admin Console | `admin@citysend.ca` | `Admin123!` | `{"role": "admin"}` |
| Driver App | `driver@citysend.ca` | `Driver123!` | `{"role": "driver"}` |
| Customer App | `demo@citysend.ca` | `Demo123!` | `{"role": "customer"}` |

### Create via SQL (run in SQL Editor):

```sql
-- IMPORTANT: Only works if you have the service_role key.
-- Easier: use Dashboard → Authentication → Users → Add user

select auth.create_user(
  uid := gen_random_uuid(),
  email := 'admin@citysend.ca',
  password := 'Admin123!',
  email_confirm := true,
  user_metadata := '{"name": "Admin User", "role": "admin"}'::jsonb
);

select auth.create_user(
  uid := gen_random_uuid(),
  email := 'driver@citysend.ca',
  password := 'Driver123!',
  email_confirm := true,
  user_metadata := '{"name": "Demo Driver", "role": "driver"}'::jsonb
);

select auth.create_user(
  uid := gen_random_uuid(),
  email := 'demo@citysend.ca',
  password := 'Demo123!',
  email_confirm := true,
  user_metadata := '{"name": "Demo Customer", "role": "customer"}'::jsonb
);
```

### Link driver auth accounts to driver records

After creating auth users, link them to driver rows:

```sql
update drivers
set user_id = (select id from auth.users where email = 'driver@citysend.ca')
where id = 'd0';
```

---

## 4. Configure Auth Settings

In **Supabase Dashboard → Authentication → Settings**:

- **Email confirmations**: Disable for local dev (enable in production)
- **Site URL**: `http://localhost:5173` (add all three ports)
- **Redirect URLs**: Add:
  - `http://localhost:5173/**`
  - `http://localhost:5174/**`
  - `http://localhost:5175/**`

---

## 5. Add Environment Variables

Copy `.env.example` to `.env` in each app directory and fill in your credentials.

Credentials are in **Supabase Dashboard → Project Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

```bash
# Apps/admin
cp apps/admin/.env.example apps/admin/.env

# Apps/driver
cp apps/driver/.env.example apps/driver/.env

# Customer app
cp app/.env.example app/.env
```

Edit each `.env`:

```env
VITE_SUPABASE_URL=https://abcdefghijklmn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Never commit `.env` files.** They contain public (anon) keys which are safe for client-side use but should still be kept out of version control.

---

## 6. Run the Apps

```bash
# Terminal 1 — Admin Console (port 5174)
cd apps/admin && npm run dev

# Terminal 2 — Driver App (port 5175)
cd apps/driver && npm run dev

# Terminal 3 — Customer App (port 5173)
cd app && npm run dev
```

---

## 7. Test the Integration

### Test scenario: Full order lifecycle

1. **Customer app** (port 5173) → sign in as `demo@citysend.ca` → create a new delivery → pay
   - ✅ Order appears in Supabase `orders` table with `status = 'new'`
   - ✅ Notification inserted into `notifications` table

2. **Admin Console** (port 5174) → sign in as `admin@citysend.ca` → open Orders
   - ✅ New order appears in real-time (Supabase realtime subscription)
   - ✅ Assign driver `Demo Driver` to the order
   - ✅ `orders.status` → `assigned`, `drivers.status` → `busy` in DB
   - ✅ Two notifications pushed: one for customer, one for driver

3. **Driver App** (port 5175) → sign in as `driver@citysend.ca`
   - ✅ Assigned order appears in Dashboard (real-time)
   - ✅ Accept → Pickup → Deliver → submit proof
   - ✅ `orders.status` → `delivered`, `receipts` row created
   - ✅ Customer notification pushed

4. **Customer App** → Notifications screen
   - ✅ Real-time notifications visible

### Test scenario: Incident report

1. **Driver App** → during delivery → "Report an Issue"
   - ✅ Row inserted in `incidents` table
   - ✅ Admin notification pushed

2. **Admin Console** → Incidents screen
   - ✅ Incident appears in real-time
   - ✅ Update status: New → In Review → Resolved

---

## Database Schema Summary

| Table | Description |
|-------|-------------|
| `profiles` | Extends `auth.users` — name, role, city |
| `drivers` | Admin-managed driver records, linked to auth users |
| `orders` | Core delivery records with JSONB pickup/dropoff/parcel/pricing |
| `receipts` | Auto-generated on delivery completion |
| `incidents` | Driver/admin incident reports |
| `notifications` | Cross-app event bus (customer / driver / admin audience) |
| `city_configs` | Admin-editable city configuration (pricing, taxes, hours) |

### Key design decisions

- **JSONB for complex fields**: `orders.pickup`, `orders.dropoff`, `orders.parcel`, `orders.price_breakdown`, and `orders.notes` are JSONB. This mirrors the existing TypeScript types exactly and requires no join overhead.
- **Text IDs**: order IDs (`CS-3001`), driver IDs (`d0`) and other existing IDs are preserved as `text` primary keys for zero-friction migration.
- **Open RLS (MVP)**: All tables use a single `cs_open_access` policy (`using (true)`) that allows any request. This matches the previous localStorage approach. **Tighten before production** using role-based checks on `auth.uid()` and `auth.jwt() ->> 'role'`.
- **Realtime on all key tables**: `orders`, `drivers`, `notifications`, `incidents`, `receipts`, `city_configs` are all added to `supabase_realtime` publication.
- **Graceful fallback**: `isSupabaseConfigured` flag in each Supabase client — if env vars are missing, the app silently falls back to localStorage behaviour.

---

## What Was Replaced

| Before | After |
|--------|-------|
| `localStorage['cs_orders_v1']` | `supabase.from('orders')` |
| `localStorage['cs_notifications_v1']` | `supabase.from('notifications')` |
| `localStorage['cs_incidents_v1']` | `supabase.from('incidents')` |
| `localStorage['cs_receipts_v1']` | `supabase.from('receipts')` |
| `localStorage['cs_city_configs_v1']` | `supabase.from('city_configs')` |
| `StorageEvent` cross-tab sync | Supabase Realtime `postgres_changes` |
| Hardcoded admin credentials | `supabase.auth.signInWithPassword()` |
| Mock driver auth map | Supabase Auth + driver table lookup |
| Express in-memory user store | Supabase Auth (customer app) |
| `MOCK_ORDERS` initial state | Fetched from DB on mount |
| `MOCK_DRIVERS` initial state | Fetched from DB on mount |

---

## Production Hardening Checklist

Before going live, update the RLS policies to enforce proper access control:

```sql
-- Example: customers can only read their own orders
drop policy cs_open_access on orders;

create policy "Customers read own orders" on orders
  for select using (customer_id = auth.uid()::text);

create policy "Drivers read assigned orders" on orders
  for select using (assigned_driver_id = (
    select id from drivers where user_id = auth.uid()
  ));

create policy "Admins read all orders" on orders
  for all using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
```

Also:
- [ ] Enable email confirmation in Auth settings
- [ ] Set up SMTP for real password-reset emails
- [ ] Enable 2FA for admin accounts
- [ ] Add rate limiting on notification inserts
- [ ] Set up database backups
- [ ] Configure connection pooling (pgBouncer) for high traffic
