/**
 * capacitor.ts — Native integration bootstrap for the customer app.
 *
 * Called once from main.tsx. All imports are dynamic so the web bundle
 * is not bloated when Capacitor is not present (tree-shaken in web builds).
 *
 * Handles:
 *   • Status bar
 *   • Push notifications — registers silently if already granted; the
 *     permission prompt is deferred to after the first order
 *     (requestPushPermissionAfterOrder), where the value is obvious
 *   • Hardware back-button (Android)
 *   • Splash safety net (App.tsx normally hides it on first paint)
 */

import { Capacitor } from '@capacitor/core'
import { cachePushToken } from '../utils/pushTokenStore'

let pushListenersAdded = false

/** Attach push listeners once (idempotent). */
async function addPushListeners(): Promise<void> {
  if (pushListenersAdded) return
  pushListenersAdded = true
  const { PushNotifications } = await import('@capacitor/push-notifications')

  PushNotifications.addListener('registration', token => {
    // Cache the token. App.tsx calls syncPushTokenToSupabase(user.id) once the
    // user is authenticated to upsert it into push_tokens for server-side delivery.
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    cachePushToken(token.value, platform)
  })

  PushNotifications.addListener('registrationError', err => {
    console.error('[Push] registration error:', err)
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('[Push] foreground notification:', notification)
  })
}

export async function setupCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Safety net: App.tsx hides the splash on first paint. If anything goes
  // wrong before that, never leave the user staring at it.
  setTimeout(() => {
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }))
      .catch(() => {})
  }, 4000)

  const [{ StatusBar, Style }, { PushNotifications }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/push-notifications'),
    import('@capacitor/app'),
  ])

  // ── Status bar ──────────────────────────────────────────────────────────────
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {})

  // ── Push notifications ──────────────────────────────────────────────────────
  // No prompt at launch. If the user already granted permission (e.g. after a
  // previous order), re-register silently so the token stays fresh.
  const perm = await PushNotifications.checkPermissions()
  if (perm.receive === 'granted') {
    await addPushListeners()
    await PushNotifications.register()
  }

  // ── Android back button ─────────────────────────────────────────────────────
  // Minimise the app on back press at the root screen instead of closing it
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) App.minimizeApp()
  })
}

/**
 * Ask for push permission right after the customer places an order — the
 * moment "get updates on your delivery" is obviously useful. Asks at most
 * once (iOS only shows the system prompt once anyway); no-op on web.
 */
export async function requestPushPermissionAfterOrder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive === 'granted') {
      await addPushListeners()
      await PushNotifications.register()
    }
  } catch (err) {
    console.warn('[Push] permission request failed', err)
  }
}
