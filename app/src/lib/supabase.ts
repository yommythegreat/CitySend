/// <reference types="vite/client" />
/**
 * Supabase client for the Customer app.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
 *
 * On native Capacitor builds, auth tokens are stored via @capacitor/preferences
 * (backed by iOS UserDefaults / Android SharedPreferences) instead of
 * localStorage. This survives the WebView being destroyed and re-created when
 * the OS kills the app in the background — something localStorage cannot
 * guarantee on all devices.
 *
 * Note: neither localStorage nor Preferences survive an Xcode "fresh install"
 * (which wipes the entire app container). That is expected dev-only behaviour.
 */
import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured =
  typeof url === 'string' && url.startsWith('https://') &&
  typeof key === 'string' && key.length > 20

// ── Native storage adapter ────────────────────────────────────────────────────
// Supabase SupportedStorage allows async getItem/setItem/removeItem.
// Lazily import Preferences so the web bundle is never affected.

async function nativeGet(key: string): Promise<string | null> {
  const { Preferences } = await import('@capacitor/preferences')
  const { value } = await Preferences.get({ key })
  return value
}
async function nativeSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.set({ key, value })
}
async function nativeRemove(key: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.remove({ key })
}

const nativeStorage = {
  getItem:    nativeGet,
  setItem:    nativeSet,
  removeItem: nativeRemove,
}

const IS_NATIVE = Capacitor.isNativePlatform()

export const supabase = createClient(
  url  ?? 'https://placeholder.supabase.co',
  key  ?? 'placeholder-anon-key',
  {
    auth: {
      storage:            IS_NATIVE ? nativeStorage : undefined,
      autoRefreshToken:   true,
      persistSession:     true,
      // URL-based session detection only works in a browser, not in the native WebView
      detectSessionInUrl: !IS_NATIVE,
    },
  },
)
