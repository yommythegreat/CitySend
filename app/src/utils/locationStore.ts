/**
 * locationStore — Customer-side driver location subscriber.
 * Uses the customer app's own Supabase client.
 *
 * Mirror of shared/utils/locationStore.ts — read-only, subscribe only.
 * Driver write side lives in apps/driver/src/store/DriverContext.tsx.
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

/**
 * Subscribe to realtime location updates for a specific driver.
 * Returns an unsubscribe function.
 */
export function subscribeToDriverLocation(
  driverId: string,
  onUpdate: (loc: DriverLocation) => void,
): () => void {
  if (!isSupabaseConfigured || !driverId) return () => {}

  // Initial fetch
  supabase
    .from('driver_locations')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle()
    .then(({ data }) => { if (data) onUpdate(rowToLocation(data)) })

  // Realtime updates
  const channel = supabase
    .channel(`driver-loc-${driverId}`)
    .on('postgres_changes' as any,
      { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
      (payload: any) => { if (payload.new) onUpdate(rowToLocation(payload.new)) },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

function rowToLocation(row: Record<string, any>): DriverLocation {
  return {
    driverId:  row.driver_id,
    orderId:   row.order_id ?? null,
    lat:       Number(row.lat),
    lng:       Number(row.lng),
    heading:   row.heading    != null ? Number(row.heading)    : null,
    accuracyM: row.accuracy_m != null ? Number(row.accuracy_m) : null,
    updatedAt: row.updated_at,
  }
}
