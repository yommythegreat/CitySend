/**
 * messageStore — In-app messaging between customer and driver.
 * Customer-app copy: imports supabase from app/src/lib so the build can
 * resolve @supabase/supabase-js from app/node_modules.
 *
 * Supabase mode: reads/writes from `messages` table with RLS.
 * Fallback mode: localStorage['cs_messages_v1'] + StorageEvent for realtime.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const MESSAGES_KEY = 'cs_messages_v1'

export interface Message {
  id:           string
  orderId:      string
  senderId:     string
  senderRole:   'customer' | 'driver' | 'admin'
  receiverId:   string
  receiverRole: 'customer' | 'driver' | 'admin'
  messageText:  string
  isRead:       boolean
  createdAt:    string
}

// ── Send ──────────────────────────────────────────────────────────────────────

export async function sendMessage(
  msg: Omit<Message, 'id' | 'isRead' | 'createdAt'>,
): Promise<void> {
  const now = new Date().toISOString()
  const id  = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const full: Message = { ...msg, id, isRead: false, createdAt: now }

  if (!isSupabaseConfigured) {
    const all = readAllSync()
    const val = JSON.stringify([full, ...all])
    localStorage.setItem(MESSAGES_KEY, val)
    window.dispatchEvent(new StorageEvent('storage', {
      key: MESSAGES_KEY, newValue: val, storageArea: localStorage,
    }))
    return
  }

  const { error } = await supabase.from('messages').insert({
    id,
    order_id:      msg.orderId,
    sender_id:     msg.senderId,
    sender_role:   msg.senderRole,
    receiver_id:   msg.receiverId,
    receiver_role: msg.receiverRole,
    message_text:  msg.messageText,
    is_read:       false,
    created_at:    now,
  })
  if (error) console.error('[messageStore] sendMessage error', error)
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getMessages(orderId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) {
    return readAllSync()
      .filter(m => m.orderId === orderId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) { console.error('[messageStore] getMessages error', error); return [] }
  return (data ?? []).map(rowToMessage)
}

// ── Mark read ─────────────────────────────────────────────────────────────────

export async function markMessagesRead(orderId: string, receiverId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const all     = readAllSync()
    const updated = all.map(m =>
      m.orderId === orderId && m.receiverId === receiverId && !m.isRead
        ? { ...m, isRead: true }
        : m,
    )
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated))
    return
  }

  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('order_id', orderId)
    .eq('receiver_id', receiverId)
    .eq('is_read', false)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToMessages(
  orderId: string,
  onUpdate: (messages: Message[]) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== MESSAGES_KEY || !e.newValue) return
      try {
        const all = JSON.parse(e.newValue) as Message[]
        onUpdate(
          all
            .filter(m => m.orderId === orderId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        )
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel = supabase
    .channel(`messages-order-${orderId}`)
    .on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      async () => {
        const msgs = await getMessages(orderId)
        onUpdate(msgs)
      },
    )
    .on(
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      async () => {
        const msgs = await getMessages(orderId)
        onUpdate(msgs)
      },
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToMessage(row: Record<string, any>): Message {
  return {
    id:           row.id,
    orderId:      row.order_id,
    senderId:     row.sender_id,
    senderRole:   row.sender_role,
    receiverId:   row.receiver_id,
    receiverRole: row.receiver_role,
    messageText:  row.message_text,
    isRead:       row.is_read,
    createdAt:    row.created_at,
  }
}

function readAllSync(): Message[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MESSAGES_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Message[]
    }
  } catch {}
  return []
}
