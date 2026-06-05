/**
 * pushTokenStore — Customer-app copy.
 *
 * Same logic as shared/utils/pushTokenStore.ts but uses the customer's own
 * Supabase client (which has Capacitor Preferences storage for native iOS).
 *
 * Flow:
 *   1. setupCapacitor() fires `cachePushToken(value, platform)` when the OS
 *      issues a registration token.
 *   2. After login, App.tsx calls `syncPushTokenToSupabase(user, 'customer')`.
 *
 * Token can arrive BEFORE or AFTER auth — cache covers both orders.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

type Platform = 'ios' | 'android'

interface CachedToken {
  value:    string
  platform: Platform
}

let cachedToken: CachedToken | null = null

const DEVICE_ID_KEY = 'cs_device_id'

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return `dev-tmp-${Date.now()}`
  }
}

export function cachePushToken(value: string, platform: Platform): void {
  cachedToken = { value, platform }
  console.log('[pushToken] cached', platform, 'token (len:', value.length + ')')
}

export async function syncPushTokenToSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  if (!cachedToken) return  // OS hasn't issued the token yet — silent no-op

  const deviceId = getOrCreateDeviceId()
  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id:    userId,
      app:        'customer',
      platform:   cachedToken.platform,
      device_id:  deviceId,
      token:      cachedToken.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,app,platform,device_id' })

  if (error) {
    console.warn('[pushToken] upsert failed:', error.message)
  } else {
    console.log('[pushToken] synced to Supabase', { platform: cachedToken.platform, deviceId })
  }
}
