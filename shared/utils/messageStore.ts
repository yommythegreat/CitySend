/**
 * messageStore — In-app messaging between customer and driver.
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

  console.log('[messageStore] sendMessage payload', {
    orderId:      msg.orderId,
    senderId:     msg.senderId,
    senderRole:   msg.senderRole,
    receiverId:   msg.receiverId,
    receiverRole: msg.receiverRole,
    isSupabaseConfigured,
  })

  if (!isSupabaseConfigured) {
    const id  = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const full: Message = { ...msg, id, isRead: false, createdAt: now }
    const all = readAllSync()
    const val = JSON.stringify([full, ...all])
    localStorage.setItem(MESSAGES_KEY, val)
    window.dispatchEvent(new StorageEvent('storage', {
      key: MESSAGES_KEY, newValue: val, storageArea: localStorage,
    }))
    return
  }

  // Do NOT pass `id` — let gen_random_uuid() handle it.
  // Passing a non-UUID string (e.g. 'msg-XXXXX') into the uuid column causes
  // a PostgreSQL type error that silently blocks every insert.
  const { error } = await supabase.from('messages').insert({
    order_id:      msg.orderId,
    sender_id:     msg.senderId,
    sender_role:   msg.senderRole,
    receiver_id:   msg.receiverId,
    receiver_role: msg.receiverRole,
    message_text:  msg.messageText,
    is_read:       false,
    created_at:    now,
  })

  if (error) {
    console.error('[messageStore] sendMessage ERROR', error)
    throw error
  }

  console.log('[messageStore] sendMessage OK')
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getMessages(orderId: string): Promise<Message[]> {
  console.log('[messageStore] getMessages orderId=', orderId, 'supabase=', isSupabaseConfigured)

  if (!isSupabaseConfigured) {
    const msgs = readAllSync()
      .filter(m => m.orderId === orderId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    console.log('[messageStore] getMessages localStorage result', msgs.length, 'messages')
    return msgs
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messageStore] getMessages ERROR', error)
    throw error
  }

  const msgs = (data ?? []).map(rowToMessage)
  console.log('[messageStore] getMessages Supabase result', msgs.length, 'messages', data)
  return msgs
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

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('order_id', orderId)
    .eq('receiver_id', receiverId)
    .eq('is_read', false)

  if (error) console.error('[messageStore] markMessagesRead ERROR', error)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToMessages(
  orderId: string,
  onUpdate: (messages: Message[]) => void,
): () => void {
  console.log('[messageStore] subscribeToMessages orderId=', orderId, 'supabase=', isSupabaseConfigured)

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
      async (payload: any) => {
        console.log('[messageStore] realtime INSERT received', payload)
        const msgs = await getMessages(orderId).catch(() => null)
        if (msgs) onUpdate(msgs)
      },
    )
    .on(
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      async (payload: any) => {
        console.log('[messageStore] realtime UPDATE received', payload)
        const msgs = await getMessages(orderId).catch(() => null)
        if (msgs) onUpdate(msgs)
      },
    )
    .subscribe((status: string) => {
      console.log('[messageStore] channel status', status)
    })

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
