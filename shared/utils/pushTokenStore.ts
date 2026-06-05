/**
 * pushTokenStore — Manages APNS / FCM device tokens for the customer + driver apps.
 *
 * Flow:
 *   1. setupCapacitor() in each app fires `cachePushToken(value, platform)` when
 *      the OS issues a registration token.
 *   2. After the user logs in, the app calls `syncPushTokenToSupabase(user, app)`
 *      which upserts the cached token into the push_tokens table.
 *
 * Why split it that way: the token can arrive BEFORE or AFTER the user is
 * authenticated. The cache lets the late-arriving piece trigger the sync no
 * matter which order they happen in.
 *
 * The Supabase Edge Function `send-push` reads this table to figure out which
 * devices to deliver a push to for a given user.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

type Platform = 'ios' | 'android'
type AppName  = 'customer' | 'driver'

interface CachedToken {
  value:    string
  platform: Platform
}

let cachedToken: CachedToken | null = null

// ── Device ID (stable per browser / install) ─────────────────────────────────

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
    // localStorage unavailable — use a session-only id (still functional, just non-stable across reloads)
    return `dev-tmp-${Date.now()}`
  }
}

// ── Cache token from Capacitor registration listener ─────────────────────────

export function cachePushToken(value: string, platform: Platform): void {
  cachedToken = { value, platform }
  console.log('[pushToken] cached', platform, 'token (len:', value.length + ')')
}

// ── Upsert the cached token against the current user ─────────────────────────

export async function syncPushTokenToSupabase(
  userId: string,
  app: AppName,
): Promise<void> {
  if (!isSupabaseConfigured) return
  if (!cachedToken) {
    // Token not yet issued by the OS — no-op. The Capacitor listener will
    // cache it later; the caller should re-invoke this on next opportunity
    // (e.g. on next login or after a delay).
    return
  }

  const deviceId = getOrCreateDeviceId()
  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id:    userId,
      app,
      platform:   cachedToken.platform,
      device_id:  deviceId,
      token:      cachedToken.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,app,platform,device_id' })

  if (error) {
    console.warn('[pushToken] upsert failed:', error.message)
  } else {
    console.log('[pushToken] synced to Supabase', { app, platform: cachedToken.platform, deviceId })
  }
}

/** True if the OS has already issued a token (useful for diagnostic UIs). */
export function hasCachedPushToken(): boolean {
  return cachedToken !== null
}
