/**
 * configStore — Customer-app side of the admin-managed config bridge.
 *
 * The Customer App only *reads* system configuration.  Writing is done
 * exclusively by the Admin Panel.
 *
 * Data flow (MVP):
 *   Admin Panel  ──write──►  localStorage['cs_city_configs_v1']
 *   Customer App ◄──read───  localStorage['cs_city_configs_v1']
 *                                  └── storageEvent → configVersion++
 *                                                   → useMemo re-derives cityConfig
 *
 * See ARCHITECTURE.md for the intended future backend-based flow.
 */

import { CITY_CONFIGS } from '../config/cityConfig'
import type { CityConfig } from '../config/cityConfig'

export const CONFIG_STORAGE_KEY = 'cs_city_configs_v1'

/**
 * Returns the current system city configurations.
 * Reads admin overrides from localStorage first; falls back to compile-time
 * defaults when localStorage is empty, unavailable, or contains invalid data.
 */
export function getSystemCityConfigs(): CityConfig[] {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CityConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // localStorage unavailable or JSON malformed — use defaults
  }
  return [...CITY_CONFIGS]
}
