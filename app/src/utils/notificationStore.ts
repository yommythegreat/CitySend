/**
 * notificationStore — Customer-side notification reader/writer.
 *
 * Supabase mode: reads from `notifications` table; realtime keeps it live.
 * Fallback mode: localStorage['cs_notifications_v1'].
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const NOTIFS_STORAGE_KEY = 'cs_notifications_v1'

export type NotifAudience = 'customer' | 'driver' | 'admin' | 'all'
export type NotifEvent =
  | 'order_created' | 'driver_assigned' | 'driver_en_route'
  | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
  | 'issue_reported' | 'receipt_generated'

export interface CustomerNotif {
  id:          string
  event:       NotifEvent
  audience:    NotifAudience
  orderId:     string
  title:       string
  body:        string
  customerId?: string
  driverId?:   string
  read:        boolean
  createdAt:   string
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchCustomerNotifs(customerId?: string): Promise<CustomerNotif[]> {
  if (!isSupabaseConfigured) return getCustomerNotifs(customerId)

  let q = supabase
    .from('notifications')
    .select('*')
    .or('audience.eq.customer,audience.eq.all')
    .order('created_at', { ascending: false })
    .limit(200)

  if (customerId) q = q.eq('customer_id', customerId)

  const { data, error } = await q
  if (error) {
    console.error('[notificationStore] fetchCustomerNotifs error', error)
    return getCustomerNotifs(customerId)
  }
  return (data ?? []).map(row => ({
    id:          row.id,
    event:       row.event,
    audience:    row.audience,
    orderId:     row.order_id,
    title:       row.title,
    body:        row.body,
    customerId:  row.customer_id ?? undefined,
    driverId:    row.driver_id   ?? undefined,
    read:        row.read,
    createdAt:   row.created_at,
  }))
}

// ── Push ──────────────────────────────────────────────────────────────────────

export async function pushCustomerNotif(params: {
  event:       NotifEvent
  audience:    NotifAudience
  orderId:     string
  title:       string
  body:        string
  customerId?: string
}): Promise<void> {
  const notif: CustomerNotif = {
    id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read:      false,
    createdAt: new Date().toISOString(),
    ...params,
  }

  if (!isSupabaseConfigured) {
    const current = readAllNotifsSync()
    writeAllNotifsSync([notif, ...current])
    return
  }

  const { error } = await supabase.from('notifications').insert({
    id:          notif.id,
    event:       notif.event,
    audience:    notif.audience,
    order_id:    notif.orderId,
    title:       notif.title,
    body:        notif.body,
    customer_id: notif.customerId ?? null,
    driver_id:   null,
    read:        false,
    created_at:  notif.createdAt,
  })
  if (error) console.error('[notificationStore] pushCustomerNotif error', error)
}

// ── Mark read ─────────────────────────────────────────────────────────────────

export async function markNotifRead(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = readAllNotifsSync()
    writeAllNotifsSync(all.map(n => n.id === id ? { ...n, read: true } : n))
    return
  }
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllNotifsRead(customerId?: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all = readAllNotifsSync()
    writeAllNotifsSync(all.map(n => {
      if (n.audience !== 'customer' && n.audience !== 'all') return n
      if (customerId && n.customerId && n.customerId !== customerId) return n
      return { ...n, read: true }
    }))
    return
  }
  // Build filter explicitly so the chain stays strongly typed.
  // RLS already scopes to the authed user's rows; customer_id filter is belt-and-braces.
  if (customerId) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('customer_id', customerId)
      .in('audience', ['customer', 'all'])
  } else {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('audience', ['customer', 'all'])
  }
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToCustomerNotifs(
  customerId: string | undefined,
  onNew: (notif: CustomerNotif) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== NOTIFS_STORAGE_KEY || !e.newValue) return
      try {
        const notifs = JSON.parse(e.newValue) as CustomerNotif[]
        const latest = notifs[0]
        if (latest && (latest.audience === 'customer' || latest.audience === 'all')) {
          if (!customerId || !latest.customerId || latest.customerId === customerId) {
            onNew(latest)
          }
        }
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel = supabase
    .channel(`customer-notifs-${customerId ?? 'all'}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const row = payload.new as any
        if (row.audience !== 'customer' && row.audience !== 'all') return
        if (customerId && row.customer_id && row.customer_id !== customerId) return
        onNew({
          id: row.id, event: row.event, audience: row.audience,
          orderId: row.order_id, title: row.title, body: row.body,
          customerId: row.customer_id ?? undefined,
          driverId:   row.driver_id   ?? undefined,
          read: row.read, createdAt: row.created_at,
        })
      },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Legacy localStorage helpers ───────────────────────────────────────────────

function readAllNotifsSync(): CustomerNotif[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(NOTIFS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as CustomerNotif[]
    }
  } catch {}
  return []
}

function writeAllNotifsSync(notifs: CustomerNotif[]): void {
  try {
    const value = JSON.stringify(notifs.slice(0, 200))
    localStorage.setItem(NOTIFS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTIFS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {}
}

export function getCustomerNotifs(customerId?: string): CustomerNotif[] {
  return readAllNotifsSync()
    .filter(n =>
      (n.audience === 'customer' || n.audience === 'all') &&
      (customerId ? !n.customerId || n.customerId === customerId : true),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
