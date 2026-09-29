/**
 * capacitor.ts — Native integration bootstrap for the driver app.
 *
 * Called once from main.tsx. All imports are dynamic so the web bundle
 * is not bloated when Capacitor is not present (tree-shaken in web builds).
 *
 * Handles:
 *   • Status bar style per screen (setStatusBarForDarkTop)
 *   • Splash screen dismissal
 *   • Hardware back-button (Android)
 *   • Push registration — no prompt at launch; the permission is requested
 *     after sign-in (ensurePushRegistered), when job alerts are obviously useful
 *
 * Location permission is requested by the location broadcaster
 * (lib/locationBroadcast.ts) when it starts after sign-in, not here.
 */

import { Capacitor } from '@capacitor/core'
import { cachePushToken, hasCachedPushToken } from '@shared/utils/pushTokenStore'

let pushListenersAdded = false
let tokenWaiters: Array<() => void> = []

async function addPushListeners(): Promise<void> {
  if (pushListenersAdded) return
  pushListenersAdded = true
  const { PushNotifications } = await import('@capacitor/push-notifications')

  PushNotifications.addListener('registration', token => {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    cachePushToken(token.value, platform)
    tokenWaiters.forEach(resolve => resolve())
    tokenWaiters = []
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

  const [{ SplashScreen }, { PushNotifications }, { App }] = await Promise.all([
    import('@capacitor/splash-screen'),
    import('@capacitor/push-notifications'),
    import('@capacitor/app'),
  ])

  // Status bar: launch default comes from capacitor.config.ts; App.tsx sets
  // the per-screen style via setStatusBarForDarkTop(). Setting it here too
  // could race with (and override) that.

  // ── Push notifications ──────────────────────────────────────────────────────
  // Re-register silently if already granted so the token stays fresh.
  const perm = await PushNotifications.checkPermissions().catch(() => null)
  if (perm?.receive === 'granted') {
    await addPushListeners()
    await PushNotifications.register().catch(() => {})
  }

  // ── Android back button ─────────────────────────────────────────────────────
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) App.minimizeApp()
  })

  // ── Splash screen ───────────────────────────────────────────────────────────
  await SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
}

/**
 * Match the status bar to the screen's top edge. Capacitor names the style by
 * the background: Style.Dark = light text (dark header), Style.Light = dark text.
 */
export async function setStatusBarForDarkTop(darkTop: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  StatusBar.setStyle({ style: darkTop ? Style.Dark : Style.Light }).catch(() => {})
}

/**
 * Ask for push permission (once) after the driver signs in, register, and
 * resolve when the OS has issued a device token — or after `timeoutMs`, so
 * callers can sync the token straight after. No-op on web.
 */
export async function ensurePushRegistered(timeoutMs = 10_000): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') return

    await addPushListeners()
    if (hasCachedPushToken()) return
    const issued = new Promise<void>(resolve => { tokenWaiters.push(resolve) })
    await PushNotifications.register()
    await Promise.race([issued, new Promise(resolve => setTimeout(resolve, timeoutMs))])
  } catch (err) {
    console.warn('[Push] permission/registration failed', err)
  }
}
