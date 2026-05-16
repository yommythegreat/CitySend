/**
 * orderStore — Shared order-state bridge.
 *
 * When Supabase is configured:
 *   - reads/writes go to the `orders` table
 *   - realtime subscriptions replace StorageEvent
 *
 * When Supabase is NOT configured (no .env):
 *   - falls back to localStorage['cs_orders_v1'] (original behaviour)
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_ORDERS } from '../mock-data/orders'
import type { Order } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const ORDERS_STORAGE_KEY = 'cs_orders_v1'

// ── DB row → TypeScript type ──────────────────────────────────────────────────

function rowToOrder(row: Record<string, any>): Order {
  return {
    id:                  row.id,
    customerId:          row.customer_id,
    customerName:        row.customer_name,
    pickup:              row.pickup,
    dropoff:             row.dropoff,
    parcel:              row.parcel,
    status:              row.status,
    assignedDriverId:    row.assigned_driver_id  ?? undefined,
    assignedDriverName:  row.assigned_driver_name ?? undefined,
    priceBreakdown:      row.price_breakdown,
    cityId:              row.city_id,
    distanceKm:          Number(row.distance_km),
    cancelReason:        row.cancel_reason ?? undefined,
    notes:               Array.isArray(row.notes) ? row.notes : [],
    handoffCode:         row.handoff_code ?? undefined,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  }
}

export function orderToRow(order: Order): Record<string, any> {
  return {
    id:                   order.id,
    customer_id:          order.customerId,
    customer_name:        order.customerName,
    pickup:               order.pickup,
    dropoff:              order.dropoff,
    parcel:               order.parcel,
    status:               order.status,
    assigned_driver_id:   order.assignedDriverId   ?? null,
    assigned_driver_name: order.assignedDriverName ?? null,
    price_breakdown:      order.priceBreakdown,
    city_id:              order.cityId,
    distance_km:          order.distanceKm,
    cancel_reason:        order.cancelReason ?? null,
    notes:                order.notes,
    handoff_code:         order.handoffCode ?? null,
    created_at:           order.createdAt,
    updated_at:           order.updatedAt,
  }
}

// ── Read (async) ──────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured) return getSharedOrders()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orderStore] fetchOrders error', error)
    return getSharedOrders()
  }
  return (data ?? []).map(rowToOrder)
}

/** Fetch orders assigned to a specific driver. */
export async function fetchDriverOrders(driverId: string): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    return getSharedOrders().filter(o => o.assignedDriverId === driverId)
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('assigned_driver_id', driverId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orderStore] fetchDriverOrders error', error)
    return []
  }
  return (data ?? []).map(rowToOrder)
}

// ── Write (async) ─────────────────────────────────────────────────────────────

export async function upsertOrder(order: Order): Promise<void> {
  if (!isSupabaseConfigured) {
    // localStorage fallback
    const current = getSharedOrders()
    const idx = current.findIndex(o => o.id === order.id)
    const next = idx >= 0
      ? current.map(o => o.id === order.id ? order : o)
      : [order, ...current]
    setSharedOrders(next)
    return
  }
  const { error } = await supabase
    .from('orders')
    .upsert(orderToRow(order), { onConflict: 'id' })
  if (error) console.error('[orderStore] upsertOrder error', error)
}

export async function upsertOrders(orders: Order[]): Promise<void> {
  if (!isSupabaseConfigured) { setSharedOrders(orders); return }
  const { error } = await supabase
    .from('orders')
    .upsert(orders.map(orderToRow), { onConflict: 'id' })
  if (error) console.error('[orderStore] upsertOrders error', error)
}

export async function updateOrderFields(
  orderId: string,
  patch: Partial<Record<string, any>>,
): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) console.error('[orderStore] updateOrderFields error', error)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

/**
 * Subscribe to all order changes.
 * Returns an unsubscribe function.
 */
export function subscribeToOrders(
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void,
  onDelete: (id: string) => void,
): () => void {
  if (!isSupabaseConfigured) {
    // LocalStorage fallback — listen for StorageEvent
    const handler = (e: StorageEvent) => {
      if (e.key !== ORDERS_STORAGE_KEY || !e.newValue) return
      try {
        const orders = JSON.parse(e.newValue) as Order[]
        if (Array.isArray(orders)) orders.forEach(o => onUpdate(o))
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel: RealtimeChannel = supabase
    .channel('orders-changes')
    .on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload: any) => onInsert(rowToOrder(payload.new)),
    )
    .on(
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload: any) => onUpdate(rowToOrder(payload.new)),
    )
    .on(
      'postgres_changes' as any,
      { event: 'DELETE', schema: 'public', table: 'orders' },
      (payload: any) => onDelete(payload.old?.id),
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Legacy localStorage API (kept for fallback + customer app) ────────────────

export function getSharedOrders(): Order[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(ORDERS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw) as Order[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [...MOCK_ORDERS]
}

export function setSharedOrders(orders: Order[]): void {
  try {
    const value = JSON.stringify(orders)
    localStorage.setItem(ORDERS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: ORDERS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {}
}

export function resetSharedOrders(): void {
  try {
    localStorage.removeItem(ORDERS_STORAGE_KEY)
    window.dispatchEvent(new StorageEvent('storage', {
      key: ORDERS_STORAGE_KEY, newValue: null, storageArea: localStorage,
    }))
  } catch {}
}
