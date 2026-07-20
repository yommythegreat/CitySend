/**
 * orderStore — Customer-side order bridge.
 *
 * Supabase mode: inserts into `orders` table; reads customer's orders from DB.
 * Fallback mode: localStorage['cs_orders_v1'].
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** Generate a random 4-digit handoff code, e.g. "0847" */
function newHandoffCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export const ORDERS_STORAGE_KEY = 'cs_orders_v1'

export interface CustomerOrder {
  id: string
  customerId: string
  customerName: string
  pickup:  { name: string; phone: string; address: string; unit?: string; note?: string }
  dropoff: { name: string; phone: string; address: string; unit?: string; note?: string }
  parcel:  { size: 's' | 'm' | 'l'; desc: string; fragile: boolean; prohibitedItemsDeclarationAccepted?: boolean; prohibitedItemsDeclarationAcceptedAt?: string; deliveryWindow?: 'morning' | 'evening' | 'express' }
  status:  'new' | 'offered' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
  assignedDriverId?:   string
  assignedDriverName?: string
  priceBreakdown: {
    baseFee: number; distanceFee: number; sizeFee: number; fragileFee: number
    subtotalPreTax: number; gst: number; pst: number; hst: number; qst: number
    totalTax: number; subtotalWithTax: number; tip: number; total: number
  }
  cityId:     string
  distanceKm: number
  createdAt:  string
  updatedAt:  string
  notes:      { id: string; text: string; authorName: string; createdAt: string }[]
  cancelReason?: string
  /** 4-digit handoff code shown to recipient for driver verification at drop-off */
  handoffCode?: string
}

// ── Write a new order ─────────────────────────────────────────────────────────

export async function pushNewOrder(order: CustomerOrder): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = readOrdersSync()
    const value   = JSON.stringify([order, ...current])
    localStorage.setItem(ORDERS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: ORDERS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
    return
  }

  const code = order.handoffCode ?? newHandoffCode()

  const { error } = await supabase.from('orders').insert({
    id:                   order.id,
    customer_id:          order.customerId,
    customer_name:        order.customerName,
    pickup:               order.pickup,
    dropoff:              order.dropoff,
    parcel:               order.parcel,
    status:               'new',
    assigned_driver_id:   null,
    assigned_driver_name: null,
    price_breakdown:      order.priceBreakdown,
    city_id:              order.cityId,
    distance_km:          order.distanceKm,
    notes:                [],
    handoff_code:         code,
    created_at:           order.createdAt,
    updated_at:           order.updatedAt,
  })
  if (error) throw new Error(error.message)
}

// ── Read customer's orders ────────────────────────────────────────────────────

export async function getCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  if (!isSupabaseConfigured) {
    return readOrdersSync()
      .filter(o => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) { console.error('[orderStore] getCustomerOrders error', error); return [] }
  return (data ?? []).map(rowToCustomerOrder)
}

export async function getOrderById(orderId: string): Promise<CustomerOrder | undefined> {
  if (!isSupabaseConfigured) {
    return readOrdersSync().find(o => o.id === orderId)
  }
  const { data } = await supabase
    .from('orders').select('*').eq('id', orderId).maybeSingle()
  return data ? rowToCustomerOrder(data) : undefined
}

// ── Realtime ──────────────────────────────────────────────────────────────────

/** Subscribe to updates for one specific order (e.g. TrackingScreen). */
export function subscribeToOrderById(
  orderId: string,
  onUpdate: (order: CustomerOrder) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== ORDERS_STORAGE_KEY || !e.newValue) return
      try {
        const orders = JSON.parse(e.newValue) as CustomerOrder[]
        const found = orders.find(o => o.id === orderId)
        if (found) onUpdate(found)
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel = supabase
    .channel(`order-by-id-${orderId}`)
    .on('postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload: any) => onUpdate(rowToCustomerOrder(payload.new as any)))
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToCustomerOrders(
  customerId: string,
  onUpdate: (order: CustomerOrder) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== ORDERS_STORAGE_KEY || !e.newValue) return
      try {
        const orders = JSON.parse(e.newValue) as CustomerOrder[]
        orders.filter(o => o.customerId === customerId).forEach(o => onUpdate(o))
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel = supabase
    .channel(`customer-orders-${customerId}`)
    .on('postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${customerId}` },
      (payload: any) => onUpdate(rowToCustomerOrder(payload.new)))
    .on('postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${customerId}` },
      (payload: any) => onUpdate(rowToCustomerOrder(payload.new)))
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToCustomerOrder(row: Record<string, any>): CustomerOrder {
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

function readOrdersSync(): CustomerOrder[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(ORDERS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as CustomerOrder[]
    }
  } catch {}
  return []
}
