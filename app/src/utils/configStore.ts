/**
 * configStore — Customer-app city configuration.
 *
 * Data flow:
 *   Supabase mode  → fetchCityConfigs() reads city_configs table;
 *                    subscribeToCityConfigs() pushes realtime updates.
 *   Dev fallback   → getSystemCityConfigs() reads localStorage (written by
 *                    admin panel on same browser when Supabase is not configured).
 *
 * The customer app is read-only: writes are done exclusively by the Admin Panel.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { CITY_CONFIGS } from '../config/cityConfig'
import type { CityConfig } from '../config/cityConfig'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const CONFIG_STORAGE_KEY = 'cs_city_configs_v1'

// ── Fetch from Supabase ───────────────────────────────────────────────────────

/**
 * Load all city configs.
 * Supabase mode: reads city_configs table (DB wins over compile-time defaults).
 * Dev fallback:  returns localStorage override if present, else CITY_CONFIGS.
 */
export async function fetchCityConfigs(): Promise<CityConfig[]> {
  if (!isSupabaseConfigured) return getSystemCityConfigs()

  const { data, error } = await supabase
    .from('city_configs')
    .select('config')

  if (error) {
    console.error('[configStore] fetchCityConfigs error', error)
    return getSystemCityConfigs()
  }
  if (!data || data.length === 0) return [...CITY_CONFIGS]

  // Merge DB rows with compile-time defaults so any city not yet in the DB
  // still appears with its hardcoded defaults.
  const dbMap = new Map(
    (data as Array<{ config: CityConfig }>).map(row => [row.config.cityId, row.config]),
  )
  return CITY_CONFIGS.map(c => dbMap.get(c.cityId) ?? c)
}

// ── Realtime subscription ─────────────────────────────────────────────────────

/**
 * Subscribe to admin config changes pushed via Supabase realtime.
 * Calls onUpdate with the full updated CityConfig whenever a row changes.
 * Returns an unsubscribe function.
 *
 * Dev fallback: listens to StorageEvent for cross-tab updates on same browser.
 */
export function subscribeToCityConfigs(
  onUpdate: (config: CityConfig) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== CONFIG_STORAGE_KEY || !e.newValue) return
      try {
        const configs = JSON.parse(e.newValue) as CityConfig[]
        if (Array.isArray(configs)) configs.forEach(c => onUpdate(c))
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel: RealtimeChannel = supabase
    .channel('customer-city-config-changes')
    .on('postgres_changes' as any,
      { event: '*', schema: 'public', table: 'city_configs' },
      (payload: any) => {
        const row = payload.new ?? payload.old
        if (row?.config) onUpdate(row.config as CityConfig)
      })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Dev-mode localStorage fallback ────────────────────────────────────────────

/**
 * Returns city configs from localStorage (written by admin panel on the same
 * browser when Supabase is not configured). Falls back to compile-time
 * CITY_CONFIGS when localStorage is empty or unavailable.
 *
 * Only used in dev mode — in production, use fetchCityConfigs() and hold the
 * result in React state.
 */
export function getSystemCityConfigs(): CityConfig[] {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CityConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // localStorage unavailable or JSON malformed — use compile-time defaults
  }
  return [...CITY_CONFIGS]
}
