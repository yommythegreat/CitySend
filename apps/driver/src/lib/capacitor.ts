/**
 * capacitor.ts — Native integration bootstrap for the driver app.
 *
 * Called once from main.tsx. All imports are dynamic so the web bundle
 * is not bloated when Capacitor is not present (tree-shaken in web builds).
 *
 * Handles:
 *   • Push notification permission + token (job offer alerts)
 *   • Status bar styling
 *   • Splash screen dismissal
 *   • Hardware back-button (Android)
 *   • Geolocation permission pre-request
 */

import { Capacitor } from '@capacitor/core'
import { cachePushToken } from '@shared/utils/pushTokenStore'

export async function setupCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const [
    { SplashScreen },
    { StatusBar, Style },
    { PushNotifications },
    { Geolocation },
    { App },
  ] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
    import('@capacitor/push-notifications'),
    import('@capacitor/geolocation'),
    import('@capacitor/app'),
  ])

  // ── Status bar ──────────────────────────────────────────────────────────────
  await StatusBar.setStyle({ style: Style.Light })   // white icons on dark bg
  await StatusBar.setBackgroundColor({ color: '#0f172a' })

  // ── Push notifications ──────────────────────────────────────────────────────
  // Drivers need reliable push for job assignment alerts.
  const permStatus = await PushNotifications.checkPermissions()
  if (permStatus.receive === 'prompt') {
    await PushNotifications.requestPermissions()
  }

  await PushNotifications.register()

  PushNotifications.addListener('registration', token => {
    console.log('[Push] driver device token:', token.value)
    // Cache the token. DriverContext (after sign-in) calls
    // syncPushTokenToSupabase(driverAuthUserId, 'driver') to upsert into
    // push_tokens for server-side delivery of job-offer pushes.
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    cachePushToken(token.value, platform)
  })

  PushNotifications.addListener('registrationError', err => {
    console.error('[Push] registration error:', err)
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('[Push] foreground notification:', notification)
  })

  // ── Geolocation ─────────────────────────────────────────────────────────────
  // Pre-request location permission on launch so it doesn't interrupt
  // the first delivery flow. iOS requires NSLocationWhenInUseUsageDescription
  // in Info.plist (Capacitor adds this automatically).
  const geoStatus = await Geolocation.checkPermissions()
  if (geoStatus.location === 'prompt' || geoStatus.location === 'prompt-with-rationale') {
    await Geolocation.requestPermissions()
  }

  // ── Android back button ─────────────────────────────────────────────────────
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) App.minimizeApp()
  })

  // ── Splash screen ───────────────────────────────────────────────────────────
  await SplashScreen.hide({ fadeOutDuration: 300 })
}
