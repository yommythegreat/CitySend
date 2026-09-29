/**
 * locationBroadcast — publishes the signed-in driver's GPS position to
 * Supabase `driver_locations` (read by the customer tracking map and admin).
 *
 * Native (iOS/Android): @capgo/background-geolocation.
 *   • Idle (no active order): foreground-only updates.
 *   • Active delivery: background updates too, so tracking keeps working
 *     while the driver navigates in Google/Apple Maps. iOS shows the blue
 *     location indicator; Android shows a persistent notification.
 * Web: navigator.geolocation.watchPosition (foreground only).
 *
 * Publishing is driven by position callbacks (throttled), not a timer —
 * JS timers are suspended while the app is backgrounded.
 */

import { Capacitor } from '@capacitor/core'
import { BackgroundGeolocation } from '@capgo/background-geolocation'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

const PUBLISH_EVERY_MS = 5_000
const IS_NATIVE = Capacitor.isNativePlatform()

export interface Fix { lat: number; lng: number; heading: number | null; accuracyM: number | null }

let driverId: string | null = null
let orderId: string | null = null
let background = false
let nativeRunning = false
// The native plugin has a single watcher; serialise start/stop so a stop()
// can never overtake the start() it's meant to cancel.
let nativeQueue: Promise<void> = Promise.resolve()
let webWatchId: number | null = null
let lastFix: Fix | null = null
let lastPublishedAt = 0

async function publish(force = false): Promise<void> {
  if (!lastFix || !driverId || !isSupabaseConfigured) return
  const now = Date.now()
  if (!force && now - lastPublishedAt < PUBLISH_EVERY_MS) return
  lastPublishedAt = now
  const { error } = await supabase.from('driver_locations').upsert({
    driver_id:  driverId,
    order_id:   orderId,
    lat:        lastFix.lat,
    lng:        lastFix.lng,
    heading:    lastFix.heading,
    accuracy_m: lastFix.accuracyM,
    updated_at: new Date(now).toISOString(),
  }, { onConflict: 'driver_id' })
  if (error) console.warn('[location] publish failed:', error.message)
}

const listeners = new Set<(fix: Fix) => void>()

function onFix(fix: Fix): void {
  lastFix = fix
  listeners.forEach(l => l(fix))
  void publish()
}

/**
 * Subscribe to the driver's live position (for the on-screen map). Reuses the
 * broadcaster's watcher rather than starting a second GPS session. Calls back
 * immediately with the last fix, if any.
 */
export function subscribePosition(listener: (fix: Fix) => void): () => void {
  listeners.add(listener)
  if (lastFix) listener(lastFix)
  return () => { listeners.delete(listener) }
}

function startWatcher(): void {
  if (IS_NATIVE) {
    const withBackground = background
    nativeQueue = nativeQueue.then(async () => {
      await BackgroundGeolocation.start(
        {
          // Presence of backgroundMessage enables background updates.
          ...(withBackground
            ? {
                backgroundTitle:   'CitySend Driver',
                backgroundMessage: 'Sharing your location with the customer during this delivery.',
              }
            : {}),
          requestPermissions: true,
          stale:              false,
          distanceFilter:     10,
        },
        (loc, err) => {
          if (err) { console.warn('[location]', err.code, err.message); return }
          if (!loc) return
          onFix({ lat: loc.latitude, lng: loc.longitude, heading: loc.bearing ?? null, accuracyM: loc.accuracy ?? null })
        },
      )
      nativeRunning = true
    }).catch(err => console.warn('[location] start failed', err))
    return
  }

  if (!('geolocation' in navigator)) return
  webWatchId = navigator.geolocation.watchPosition(
    ({ coords }) => onFix({
      lat: coords.latitude, lng: coords.longitude,
      heading: coords.heading ?? null, accuracyM: coords.accuracy ?? null,
    }),
    err => console.warn('[location] geolocation error:', err.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  )
}

function stopWatcher(): void {
  if (IS_NATIVE) {
    nativeQueue = nativeQueue.then(async () => {
      if (!nativeRunning) return
      nativeRunning = false
      await BackgroundGeolocation.stop()
    }).catch(err => console.warn('[location] stop failed', err))
  }
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId)
    webWatchId = null
  }
}

/** Start broadcasting after sign-in. Safe to call repeatedly. */
export function startLocationBroadcast(nextDriverId: string, nextOrderId: string | null): void {
  stopLocationBroadcast()
  driverId   = nextDriverId
  orderId    = nextOrderId
  background = nextOrderId !== null
  startWatcher()
}

/** Stop broadcasting (sign-out). */
export function stopLocationBroadcast(): void {
  stopWatcher()
  driverId = null
  orderId = null
  lastFix = null
  lastPublishedAt = 0
}

/**
 * Active order changed. Publishes the new orderId immediately; restarts the
 * native watcher only when background mode needs to switch on or off.
 */
export function updateBroadcastOrder(nextDriverId: string, nextOrderId: string | null): void {
  if (driverId !== nextDriverId) { startLocationBroadcast(nextDriverId, nextOrderId); return }
  orderId = nextOrderId
  const wantBackground = nextOrderId !== null
  if (wantBackground !== background) {
    background = wantBackground
    stopWatcher()
    startWatcher()
  }
  void publish(true)
}

