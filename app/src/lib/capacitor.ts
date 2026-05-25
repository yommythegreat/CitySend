/**
 * capacitor.ts — Native integration bootstrap for the customer app.
 *
 * Called once from main.tsx. All imports are dynamic so the web bundle
 * is not bloated when Capacitor is not present (tree-shaken in web builds).
 *
 * Handles:
 *   • Push notification permission request + token registration
 *   • Status bar / splash screen dismissal
 *   • Hardware back-button (Android)
 */

import { Capacitor } from '@capacitor/core'

export async function setupCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const [
    { SplashScreen },
    { StatusBar, Style },
    { PushNotifications },
    { App },
  ] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
    import('@capacitor/push-notifications'),
    import('@capacitor/app'),
  ])

  // ── Status bar ──────────────────────────────────────────────────────────────
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#ffffff' })

  // ── Push notifications ──────────────────────────────────────────────────────
  const permStatus = await PushNotifications.checkPermissions()
  if (permStatus.receive === 'prompt') {
    await PushNotifications.requestPermissions()
  }

  await PushNotifications.register()

  // Log the FCM/APNs token — in production, send this to your backend
  // to associate with the customer's account for targeted notifications.
  PushNotifications.addListener('registration', token => {
    console.log('[Push] device token:', token.value)
    // TODO: POST token to your API and store against the customer's profile
  })

  PushNotifications.addListener('registrationError', err => {
    console.error('[Push] registration error:', err)
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('[Push] foreground notification:', notification)
  })

  // ── Android back button ─────────────────────────────────────────────────────
  // Minimise the app on back press at the root screen instead of closing it
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) App.minimizeApp()
  })

  // ── Splash screen ───────────────────────────────────────────────────────────
  await SplashScreen.hide({ fadeOutDuration: 300 })
}
