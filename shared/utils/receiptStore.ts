/**
 * receiptStore — Shared receipt bridge.
 *
 * Supabase mode: CRUD on `receipts` table + realtime.
 * Fallback mode: localStorage['cs_receipts_v1'].
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { MOCK_RECEIPTS } from '../mock-data/receipts'
import type { Receipt } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const RECEIPTS_STORAGE_KEY = 'cs_receipts_v1'

// ── DB row → TypeScript type ──────────────────────────────────────────────────

function rowToReceipt(row: Record<string, any>): Receipt {
  return {
    id:            row.id,
    orderId:       row.order_id,
    customerId:    row.customer_id,
    customerName:  row.customer_name,
    amount:        Number(row.amount),
    tax:           Number(row.tax),
    tip:           Number(row.tip),
    total:         Number(row.total),
    paymentMethod: row.payment_method,
    last4:         row.last4,
    brand:         row.brand,
    createdAt:     row.created_at,
  }
}

function receiptToRow(r: Receipt): Record<string, any> {
  return {
    id:             r.id,
    order_id:       r.orderId,
    customer_id:    r.customerId,
    customer_name:  r.customerName,
    amount:         r.amount,
    tax:            r.tax,
    tip:            r.tip,
    total:          r.total,
    payment_method: r.paymentMethod,
    last4:          r.last4,
    brand:          r.brand,
    created_at:     r.createdAt,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchReceipts(): Promise<Receipt[]> {
  if (!isSupabaseConfigured) return getSharedReceipts()

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[receiptStore] fetchReceipts error', error)
    return getSharedReceipts()
  }
  return (data ?? []).map(rowToReceipt)
}

/** Fetch receipts for a specific customer. */
export async function fetchCustomerReceipts(customerId: string): Promise<Receipt[]> {
  if (!isSupabaseConfigured) {
    return getSharedReceipts().filter(r => r.customerId === customerId)
  }
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[receiptStore] fetchCustomerReceipts error', error)
    return []
  }
  return (data ?? []).map(rowToReceipt)
}

// ── Insert ────────────────────────────────────────────────────────────────────

export async function insertReceipt(receipt: Receipt): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSharedReceipts()
    setSharedReceipts([receipt, ...current])
    return
  }
  const { error } = await supabase
    .from('receipts')
    .insert(receiptToRow(receipt))
  if (error) console.error('[receiptStore] insertReceipt error', error)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToReceipts(
  onInsert: (receipt: Receipt) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== RECEIPTS_STORAGE_KEY || !e.newValue) return
      try {
        const receipts = JSON.parse(e.newValue) as Receipt[]
        if (Array.isArray(receipts) && receipts.length > 0) onInsert(receipts[0])
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel: RealtimeChannel = supabase
    .channel('receipts-inserts')
    .on('postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'receipts' },
      (payload: any) => onInsert(rowToReceipt(payload.new)))
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Legacy localStorage API ───────────────────────────────────────────────────

export function getSharedReceipts(): Receipt[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(RECEIPTS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw) as Receipt[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [...MOCK_RECEIPTS]
}

export function setSharedReceipts(receipts: Receipt[]): void {
  try {
    const value = JSON.stringify(receipts)
    localStorage.setItem(RECEIPTS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: RECEIPTS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {}
}
