import { Capacitor } from '@capacitor/core'

/**
 * Resolve an API path to a full URL.
 *
 * The web build is served from the same origin as the serverless API
 * (Vercel), so relative paths work. The native iOS/Android build loads bundled
 * assets from capacitor://localhost, where a relative "/api/..." never reaches
 * the backend — so on native we point at the deployed origin.
 */
const REMOTE_ORIGIN = 'https://www.citysend.ca'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return Capacitor.isNativePlatform() ? `${REMOTE_ORIGIN}${p}` : p
}
