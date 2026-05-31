/**
 * notificationStore — Cross-app notification event bus.
 *
 * Supabase mode: inserts into `notifications` table; realtime delivers to all apps.
 * Fallback mode: localStorage['cs_notifications_v1'] with StorageEvent broadcast.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AppNotification, NotificationEvent, NotificationAudience } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const NOTIFS_STORAGE_KEY = 'cs_notifications_v1'

// ── DB row → TypeScript type ──────────────────────────────────────────────────

function rowToNotif(row: Record<string, any>): AppNotification {
  return {
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
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchNotifications(
  audience: NotificationAudience,
  customerId?: string,
  driverId?: string,
): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) {
    return getSharedNotifications().filter(
      n => n.audience === audience || n.audience === 'all',
    )
  }

  let q = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (audience !== 'all') {
    q = q.or(`audience.eq.${audience},audience.eq.all`)
  }
  if (customerId) q = q.eq('customer_id', customerId)
  if (driverId)   q = q.eq('driver_id',   driverId)

  const { data, error } = await q
  if (error) {
    console.error('[notificationStore] fetchNotifications error', error)
    return []
  }
  return (data ?? []).map(rowToNotif)
}

// ── Push ──────────────────────────────────────────────────────────────────────

export async function pushNotification(params: {
  event:       NotificationEvent
  audience:    NotificationAudience
  orderId:     string
  title:       string
  body:        string
  customerId?: string
  driverId?:   string
}): Promise<void> {
  const notif: AppNotification = {
    id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read:      false,
    createdAt: new Date().toISOString(),
    ...params,
  }

  if (!isSupabaseConfigured) {
    // localStorage fallback
    const current = getSharedNotifications()
    setSharedNotifications([notif, ...current])
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
    driver_id:   notif.driverId   ?? null,
    read:        false,
    created_at:  notif.createdAt,
  })
  if (error) console.error('[notificationStore] pushNotification error', error)
}

// ── Mark read ─────────────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSharedNotifications()
    setSharedNotifications(current.map(n => n.id === id ? { ...n, read: true } : n))
    return
  }
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllNotificationsRead(
  audience: NotificationAudience,
  customerId?: string,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSharedNotifications()
    setSharedNotifications(
      current.map(n =>
        (n.audience === audience || n.audience === 'all') ? { ...n, read: true } : n,
      ),
    )
    return
  }
  let q = supabase
    .from('notifications')
    .update({ read: true })
    .or(`audience.eq.${audience},audience.eq.all`)
  if (customerId) q = (q as any).eq('customer_id', customerId)
  await q
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToNotifications(
  audience: NotificationAudience,
  onNew: (notif: AppNotification) => void,
  customerId?: string,
  driverId?: string,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== NOTIFS_STORAGE_KEY || !e.newValue) return
      try {
        const notifs = JSON.parse(e.newValue) as AppNotification[]
        const latest = notifs[0]
        if (latest && (latest.audience === audience || latest.audience === 'all')) {
          onNew(latest)
        }
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  // Supabase postgres_changes supports only ONE filter condition.
  // Use the id column (customer_id / driver_id) as the single filter so
  // Supabase can confirm row visibility against the RLS policy.
  // audience + event-type filtering is done client-side in the onNew callback.
  let filter: string
  if (customerId) {
    filter = `customer_id=eq.${customerId}`
  } else if (driverId) {
    filter = `driver_id=eq.${driverId}`
  } else {
    filter = `audience=eq.${audience}`
  }

  const channelKey = driverId ?? customerId ?? 'all'
  const channel: RealtimeChannel = supabase
    .channel(`notifications-${audience}-${channelKey}`)
    .on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'notifications', filter },
      (payload: any) => onNew(rowToNotif(payload.new)),
    )
    .subscribe((status: string, err?: Error) => {
      if (err) {
        console.error('[notificationStore] subscribe error', status, err)
      } else {
        console.log('[notificationStore] notifications channel status:', status)
      }
    })

  return () => { supabase.removeChannel(channel) }
}

// ── Legacy localStorage API (fallback) ───────────────────────────────────────

export function getSharedNotifications(): AppNotification[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(NOTIFS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw) as AppNotification[]
      if (Array.isArray(parsed)) return parsed.slice(0, 200)
    }
  } catch {}
  return []
}

export function setSharedNotifications(notifs: AppNotification[]): void {
  try {
    const value = JSON.stringify(notifs.slice(0, 200))
    localStorage.setItem(NOTIFS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTIFS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {}
}
