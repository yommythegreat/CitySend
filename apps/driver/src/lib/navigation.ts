/**
 * navigation — hand the destination to the driver's preferred maps app.
 * Universal https links: they open the installed app, or the web version.
 */

export type NavApp = 'apple' | 'google' | 'waze'

export const NAV_APPS: { id: NavApp; label: string }[] = [
  { id: 'apple',  label: 'Apple Maps' },
  { id: 'google', label: 'Google Maps' },
  { id: 'waze',   label: 'Waze' },
]

const KEY = 'cs_driver_nav_app'

export function getNavApp(): NavApp | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'apple' || v === 'google' || v === 'waze' ? v : null
  } catch { return null }
}

export function setNavApp(app: NavApp | null): void {
  try { app ? localStorage.setItem(KEY, app) : localStorage.removeItem(KEY) } catch {}
}

export function openNavigation(app: NavApp, dest: { address: string; lat?: number; lng?: number }): void {
  const q = dest.lat != null && dest.lng != null ? `${dest.lat},${dest.lng}` : dest.address
  const e = encodeURIComponent(q)
  const url = {
    apple:  `https://maps.apple.com/?daddr=${e}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=driving`,
    waze:   dest.lat != null && dest.lng != null
      ? `https://waze.com/ul?ll=${e}&navigate=yes`
      : `https://waze.com/ul?q=${e}&navigate=yes`,
  }[app]
  window.open(url, '_blank')
}
