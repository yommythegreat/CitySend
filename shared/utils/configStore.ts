/**
 * configStore — Admin-managed city configuration bridge.
 *
 * Supabase mode: reads/writes `city_configs` table; realtime notifies all apps.
 * Fallback mode: localStorage['cs_city_configs_v1'] (original behaviour).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { CITY_CONFIGS } from '../config/cityConfig'
import type { CityConfig } from '../config/cityConfig'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const CONFIG_STORAGE_KEY = 'cs_city_configs_v1'

// ── Fetch ─────────────────────────────────────────────────────────────────────

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

  // Merge DB rows with compile-time defaults (DB wins)
  const dbMap = new Map(
    (data as Array<{ config: CityConfig }>).map(row => [row.config.cityId, row.config]),
  )
  return CITY_CONFIGS.map(c => dbMap.get(c.cityId) ?? c)
}

// ── Write (admin only) ────────────────────────────────────────────────────────

export async function saveCityConfig(config: CityConfig): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSystemCityConfigs()
    setSystemCityConfigs(current.map(c => c.cityId === config.cityId ? config : c))
    return
  }
  const { error } = await supabase
    .from('city_configs')
    .upsert({ city_id: config.cityId, config, updated_at: new Date().toISOString() },
             { onConflict: 'city_id' })
  if (error) console.error('[configStore] saveCityConfig error', error)
}

export async function saveAllCityConfigs(configs: CityConfig[]): Promise<void> {
  if (!isSupabaseConfigured) { setSystemCityConfigs(configs); return }
  const rows = configs.map(c => ({
    city_id: c.cityId, config: c, updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('city_configs')
    .upsert(rows, { onConflict: 'city_id' })
  if (error) console.error('[configStore] saveAllCityConfigs error', error)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

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
    .channel('city-config-changes')
    .on('postgres_changes' as any,
      { event: '*', schema: 'public', table: 'city_configs' },
      (payload: any) => {
        const row = payload.new ?? payload.old
        if (row?.config) onUpdate(row.config as CityConfig)
      })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Legacy localStorage API ───────────────────────────────────────────────────

export function getSystemCityConfigs(): CityConfig[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(CONFIG_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw) as CityConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [...CITY_CONFIGS]
}

export function setSystemCityConfigs(configs: CityConfig[]): void {
  try {
    const value = JSON.stringify(configs)
    localStorage.setItem(CONFIG_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: CONFIG_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {
    console.warn('[configStore] Could not persist city configs to localStorage')
  }
}

export function resetSystemCityConfigs(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
    window.dispatchEvent(new StorageEvent('storage', {
      key: CONFIG_STORAGE_KEY, newValue: null, storageArea: localStorage,
    }))
  } catch {}
}
