/**
 * theme — automatic night mode.
 *
 * Dark between local sunset and sunrise (drivers work evening windows and a
 * white screen in a dark car is harsh), or whenever the phone itself is in
 * dark mode. Applied as <html data-theme="dark">; index.css swaps the tokens.
 */

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// CitySend operates in Winnipeg only; a fixed point is accurate to a few
// minutes anywhere in the city and avoids a location lookup at launch.
const SERVICE_AREA = { lat: 49.8951, lng: -97.1384 }

const RAD = Math.PI / 180

/** Sunrise or sunset (UTC ms) for the given local calendar day. NOAA approximation. */
function sunEvent(day: Date, lat: number, lng: number, rising: boolean): number | null {
  const start = Date.UTC(day.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - start) / 86_400_000)
  const lngHour = lng / 15
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24

  const M = 0.9856 * t - 3.289
  const L = (M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634 + 360) % 360

  let RA = (Math.atan(0.91764 * Math.tan(L * RAD)) / RAD + 360) % 360
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15

  const sinDec = 0.39782 * Math.sin(L * RAD)
  const cosDec = Math.cos(Math.asin(sinDec))
  const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD))
  if (cosH > 1 || cosH < -1) return null   // polar day/night — not reachable in Winnipeg

  const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15
  const T = H + RA - 0.06571 * t - 6.622
  const UT = ((T - lngHour) % 24 + 24) % 24

  return Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) + UT * 3_600_000
}

export function isNight(now = new Date()): boolean {
  const { lat, lng } = SERVICE_AREA
  const sunrise = sunEvent(now, lat, lng, true)
  let sunset = sunEvent(now, lat, lng, false)
  if (sunrise == null || sunset == null) return false
  // West of Greenwich, sunset in UTC can roll past midnight into the next UTC day.
  if (sunset < sunrise) sunset += 86_400_000
  const t = now.getTime()
  return t < sunrise || t > sunset
}

const darkQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

export function computeTheme(now = new Date()): Theme {
  return darkQuery?.matches || isNight(now) ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (root.dataset.theme !== theme) root.dataset.theme = theme
}

/** Current theme; re-evaluated every minute and when the phone's appearance changes. */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => computeTheme())

  useEffect(() => {
    const update = () => setTheme(computeTheme())
    const id = window.setInterval(update, 60_000)
    darkQuery?.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(id)
      darkQuery?.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  useEffect(() => { applyTheme(theme) }, [theme])

  return theme
}
