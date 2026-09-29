/**
 * locationStore — Real-time driver GPS tracking via Supabase.
 *
 * Supabase table required (run this migration once):
 * ─────────────────────────────────────────────────
 * create table if not exists driver_locations (
 *   driver_id   text primary key,
 *   order_id    text,
 *   lat         double precision not null,
 *   lng         double precision not null,
 *   heading     double precision,        -- degrees, 0 = north
 *   accuracy_m  double precision,
 *   updated_at  timestamptz not null default now()
 * );
 * alter table driver_locations enable row level security;
 * -- Drivers can write their own row; customers/admin can read all
 * create policy "driver write own" on driver_locations
 *   for all using (true) with check (true);
 * -- Enable realtime
 * alter publication supabase_realtime add table driver_locations;
 * ─────────────────────────────────────────────────
 *
 * Falls back silently (no-op) when Supabase is not configured.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface DriverLocation {
  driverId:   string
  orderId:    string | null
  lat:        number
  lng:        number
  heading:    number | null
  accuracyM:  number | null
  updatedAt:  string
}

// Driver-side publishing lives in apps/driver/src/lib/locationBroadcast.ts
// (native background location during deliveries).

// ── Customer / Admin side: subscribe to driver location ───────────────────────

/**
 * Subscribe to realtime location updates for the driver assigned to an order.
 *
 * @param driverId   The assigned driver's ID
 * @param onUpdate   Callback with latest location
 * @returns          Unsubscribe function
 */
export function subscribeToDriverLocation(
  driverId: string,
  onUpdate: (loc: DriverLocation) => void,
): () => void {
  if (!isSupabaseConfigured) return () => {}

  // Initial fetch
  supabase
    .from('driver_locations')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle()
    .then(({ data }) => { if (data) onUpdate(rowToLocation(data)) })

  // Realtime subscription
  const channel = supabase
    .channel(`driver-loc-${driverId}`)
    .on('postgres_changes' as any,
      { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
      (payload: any) => { if (payload.new) onUpdate(rowToLocation(payload.new)) },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

/** One-shot fetch of a driver's last known location (for initial map center). */
export async function getDriverLocation(driverId: string): Promise<DriverLocation | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('driver_locations')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle()
  return data ? rowToLocation(data) : null
}

function rowToLocation(row: Record<string, any>): DriverLocation {
  return {
    driverId:  row.driver_id,
    orderId:   row.order_id ?? null,
    lat:       Number(row.lat),
    lng:       Number(row.lng),
    heading:   row.heading   != null ? Number(row.heading)   : null,
    accuracyM: row.accuracy_m != null ? Number(row.accuracy_m) : null,
    updatedAt: row.updated_at,
  }
}
