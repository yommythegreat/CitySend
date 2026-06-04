import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { HomeScreen }          from './screens/HomeScreen'
import { NewRequestScreen }    from './screens/NewRequestScreen'
import { PricingScreen }       from './screens/PricingScreen'
import { PaymentScreen }       from './screens/PaymentScreen'
import { TrackingScreen }      from './screens/TrackingScreen'
import { HistoryScreen }       from './screens/HistoryScreen'
import { BillingScreen }       from './screens/BillingScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { AuthScreen }          from './screens/AuthScreen'
import { ForgotPasswordScreen }  from './screens/ForgotPasswordScreen'
import { ResetPasswordScreen }   from './screens/ResetPasswordScreen'
import { LandingScreen }        from './screens/LandingScreen'
import { ProfileScreen }       from './screens/ProfileScreen'
import { SettingsScreen }      from './screens/SettingsScreen'
import { AddPlaceScreen }      from './screens/AddPlaceScreen'
import { CityBlockedScreen }   from './screens/CityBlockedScreen'
import { PrivacyScreen }       from './screens/PrivacyScreen'
import { TermsScreen }         from './screens/TermsScreen'
import { AboutScreen }         from './screens/AboutScreen'
import { TabBar }              from './components/TabBar'
import { BLANK_DRAFT, INITIAL_STATE } from './data/mock'
import { getCityConfig, getCityConfigByDetectedName, computeOrderPrice, canStartOrder } from './utils/serviceAvailability'
import { fetchCityConfigs, subscribeToCityConfigs } from './utils/configStore'
import { pushNewOrder, getCustomerOrders, type CustomerOrder } from './utils/orderStore'
import { pushCustomerNotif, NOTIFS_STORAGE_KEY, subscribeToCustomerNotifs, fetchCustomerNotifs } from './utils/notificationStore'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Capacitor } from '@capacitor/core'

const IS_NATIVE = Capacitor.isNativePlatform()
import { CITY_CONFIGS } from './config/cityConfig'
import type { CityConfig } from './config/cityConfig'
import type { ScreenName, Draft, AppState, NavOptions, AuthUser, CityId, Delivery } from './types'

const TAB_SCREENS: ScreenName[] = ['home', 'history', 'notifications']

// ── Tracking deep-link helper ─────────────────────────────────────────────────

/**
 * Extracts orderId from a /tracking/:orderId URL path.
 * Returns undefined for any other path.
 */
function parseTrackingId(pathname = window.location.pathname): string | undefined {
  const m = pathname.match(/^\/tracking\/([^/]+)$/)
  return m ? decodeURIComponent(m[1]) : undefined
}

// ── Geolocation city detection ────────────────────────────────────────────────

async function detectCityFromGeolocation(configs: CityConfig[]): Promise<CityId | null> {
  if (!('geolocation' in navigator)) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          )
          const data = await res.json()
          const rawCity: string =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            ''
          const config = rawCity ? getCityConfigByDetectedName(rawCity, configs) : undefined
          resolve(config?.cityId ?? null)
        } catch {
          resolve(null)
        }
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 60_000 },
    )
  })
}

// ── Session-storage helpers for booking continuity ───────────────────────────
//
// Booking screens (new-1 through payment) and the in-progress draft are
// persisted to sessionStorage so a page refresh doesn't drop the user back to
// the landing page. sessionStorage is tab-scoped and auto-cleared when the tab
// closes, so there's no cross-session bleed.
//
// Guest sessions intentionally bypass this: guests have no persistent identity,
// so restoring a booking mid-flow after a refresh is impossible.

const BOOKING_SCREENS: ScreenName[] = ['new-1', 'new-2', 'new-3', 'pricing', 'pay']
const SESSION_SCREEN_KEY = 'cs_screen'
const SESSION_DRAFT_KEY  = 'cs_draft'

function saveBookingSession(screen: ScreenName, draft: Draft) {
  if (BOOKING_SCREENS.includes(screen)) {
    sessionStorage.setItem(SESSION_SCREEN_KEY, screen)
    sessionStorage.setItem(SESSION_DRAFT_KEY,  JSON.stringify(draft))
  } else {
    clearBookingSession()
  }
}

function clearBookingSession() {
  sessionStorage.removeItem(SESSION_SCREEN_KEY)
  sessionStorage.removeItem(SESSION_DRAFT_KEY)
}

function restoreBookingSession(): { screen: ScreenName; draft: Draft } | null {
  try {
    const s = sessionStorage.getItem(SESSION_SCREEN_KEY) as ScreenName | null
    const d = sessionStorage.getItem(SESSION_DRAFT_KEY)
    if (s && BOOKING_SCREENS.includes(s) && d) {
      return { screen: s, draft: JSON.parse(d) as Draft }
    }
  } catch {}
  return null
}

// ── User-scoped localStorage helpers ─────────────────────────────────────────

const savedAddressesKey = (userId: string) => `cs_saved_places_${userId}`

function loadSavedAddresses(userId: string): AppState['savedAddresses'] {
  try {
    const raw = localStorage.getItem(savedAddressesKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Convert a CustomerOrder (from Supabase/orderStore) into the legacy Delivery UI type. */
function orderToDelivery(o: CustomerOrder): Delivery {
  const created = new Date(o.createdAt)
  const now     = new Date()
  const diffDays = Math.floor((now.getTime() - created.getTime()) / 86_400_000)
  const when    = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday'
    : created.toLocaleDateString('en-CA', { weekday: 'short' })
  const date    = created.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

  // Map OrderStatus → legacy Delivery status
  const statusMap: Record<string, Delivery['status']> = {
    new:        'in-transit',
    offered:    'in-transit',
    assigned:   'in-transit',
    picked_up:  'in-transit',
    in_transit: 'in-transit',
    delivered:  'delivered',
    cancelled:  'canceled',
  }

  // Strip the 'CS-' prefix to get the numeric ID the UI expects
  const numericId = o.id.replace(/^CS-/, '')

  return {
    id:             numericId,
    to:             { name: o.dropoff.name, address: o.dropoff.address, phone: o.dropoff.phone },
    date,
    price:          o.priceBreakdown?.total?.toFixed(2) ?? '0.00',
    status:         statusMap[o.status] ?? 'in-transit',
    when,
    priceBreakdown: o.priceBreakdown,
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Initialise screen + trackingOrderId from the URL so that a hard-refresh
  // of /tracking/:orderId lands on the correct screen without a redirect.
  const [screen,          setScreen]          = useState<ScreenName>(() =>
    parseTrackingId() ? 'tracking' : IS_NATIVE ? 'auth' : 'home',
  )
  const [state,           setState]           = useState<AppState>(INITIAL_STATE)
  const [draft,           setDraft]           = useState<Draft>(BLANK_DRAFT)
  const [user,            setUser]            = useState<AuthUser | null>(null)
  const [authChecked,     setAuthChecked]     = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(
    () => parseTrackingId(),
  )

  // Persist active booking screen + draft to sessionStorage so a page refresh
  // during a booking flow restores the user to where they left off (registered
  // users only — guests are ephemeral and always start fresh).
  // Guard: skip the write when neither screen nor the serialized draft changed
  // so typing in a form field doesn't repeatedly serialize the whole object.
  const _prevBookingKey = useRef('')
  useEffect(() => {
    if (!user || user.id === 'guest') return
    const key = BOOKING_SCREENS.includes(screen) ? `${screen}::${JSON.stringify(draft)}` : screen
    if (key === _prevBookingKey.current) return
    _prevBookingKey.current = key
    saveBookingSession(screen, draft)
  }, [screen, draft, user])

  // Refs so go() callback is never stale
  const userRef            = useRef<AuthUser | null>(null)
  const selectedCityRef    = useRef<CityId>(INITIAL_STATE.selectedCityId)
  const configsRef         = useRef<CityConfig[]>(CITY_CONFIGS)
  // trackingOrderIdRef keeps the current orderId instantly available inside go()
  // without waiting for a useEffect — required for the payment-flow handoff where
  // onPaymentComplete sets the ID and go('tracking') fires synchronously after.
  const trackingOrderIdRef = useRef<string | undefined>(parseTrackingId())
  // Navigation history stack — enables go('back') to return to the previous screen.
  // Stored in a ref (not state) so go() reads/writes it without stale-closure issues.
  const screenRef      = useRef<ScreenName>(screen)
  const navHistoryRef  = useRef<ScreenName[]>([])
  // Tracks which user's saved-addresses have been loaded from Supabase. The
  // persist effect refuses to write until this matches the current user.id —
  // prevents the initial empty state from being persisted before loadUserData
  // has populated state.savedAddresses (which would wipe Supabase on every
  // login/refresh).
  const savedAddrLoadedForRef = useRef<string | null>(null)
  // Dedupes concurrent loadUserData calls. Supabase fires both SIGNED_IN and
  // INITIAL_SESSION on page load — without this each event would trigger its
  // own loadUserData, each of which would persist the loaded data, producing
  // two parallel UPDATE requests that race. A delayed earlier write can land
  // AFTER a newer write (e.g. when the user adds a place fast), overwriting
  // the new state with old data. Reset to null on logout.
  const loadingForUserRef = useRef<string | null>(null)
  // Tracks the previous savedAddresses count for the current user. The persist
  // effect refuses to write [] when the previous count was >1 — that pattern
  // (N>1 places suddenly disappearing) is almost always a bug, not a real
  // delete. Real deletes are incremental (N → N-1 → ... → 0).
  const prevAddrCountRef = useRef<number>(0)
  useEffect(() => { userRef.current    = user },                       [user])
  useEffect(() => { selectedCityRef.current = state.selectedCityId },  [state.selectedCityId])
  useEffect(() => { trackingOrderIdRef.current = trackingOrderId },    [trackingOrderId])
  useEffect(() => { screenRef.current = screen },                      [screen])

  // ── City configs — Supabase as single source of truth ───────────────────────
  // Initialised with compile-time defaults so the UI renders immediately.
  // Replaced with Supabase data on first fetch, then kept in sync via realtime.
  const [configs, setConfigs] = useState<CityConfig[]>(CITY_CONFIGS)
  useEffect(() => { configsRef.current = configs }, [configs])

  // notifVersion bumps whenever new notifications arrive OR are marked as read
  const [notifVersion, setNotifVersion] = useState(0)
  const [unreadCount,  setUnreadCount]  = useState(0)

  // ── Unread notification count ─────────────────────────────────────────────────
  // Re-fetched whenever a new notification arrives OR the user marks one as read.
  useEffect(() => {
    const uid = userRef.current?.id
    if (!uid || uid === 'guest') { setUnreadCount(0); return }
    fetchCustomerNotifs(uid).then(notifs => {
      setUnreadCount(notifs.filter(n => !n.read).length)
    }).catch(() => {})
  }, [notifVersion, user?.id])

  // ── Browser back / forward navigation ───────────────────────────────────────
  useEffect(() => {
    const handlePop = () => {
      const id = parseTrackingId()
      if (id) {
        setTrackingOrderId(id)
        trackingOrderIdRef.current = id
        setScreen('tracking')
      } else {
        setScreen('home')
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    // ── Load configs from Supabase on mount ──────────────────────────────────
    fetchCityConfigs().then(fetched => {
      console.log('[Config] loaded', fetched.length, 'city configs from Supabase')
      setConfigs(fetched)
    }).catch(err => console.error('[Config] fetchCityConfigs error', err))

    // ── Realtime: admin pushes config change → update specific city in state ─
    const unsubConfigs = subscribeToCityConfigs((updated) => {
      console.log('[Config] realtime update for', updated.cityId)
      setConfigs(prev => prev.map(c => c.cityId === updated.cityId ? updated : c))
    })

    // ── Legacy StorageEvent (dev fallback, same-browser cross-tab) ───────────
    const legacyHandler = (e: StorageEvent) => {
      if (e.key === NOTIFS_STORAGE_KEY) setNotifVersion(v => v + 1)
    }
    window.addEventListener('storage', legacyHandler)

    // ── Supabase realtime: notifVersion bump on new notifications ─────────────
    const unsubNotifs = subscribeToCustomerNotifs(
      userRef.current?.id,
      (_notif) => setNotifVersion(v => v + 1),
    )

    return () => {
      unsubConfigs()
      window.removeEventListener('storage', legacyHandler)
      unsubNotifs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive selected city config from live configs state
  const cityConfig = useMemo(
    () => getCityConfig(state.selectedCityId, configs),
    [state.selectedCityId, configs],
  )

  // ── Load user-specific data (addresses from Supabase, orders from Supabase) ──
  const loadUserData = useCallback(async (authUser: AuthUser) => {
    // De-dupe: Supabase fires SIGNED_IN + INITIAL_SESSION on every refresh, each
    // calling this. Without this guard we get two parallel persists and a race.
    if (loadingForUserRef.current === authUser.id) {
      console.log('[loadUserData] skip — already loading/loaded for', authUser.id)
      return
    }
    loadingForUserRef.current = authUser.id

    // Address loading strategy:
    //
    // The persist effect writes localStorage SYNCHRONOUSLY before the async
    // Supabase UPDATE. If we read from Supabase first on load, we can get a
    // stale snapshot (the last write hasn't committed yet). We then persist
    // that stale snapshot, OVERWRITING the pending write — causing the "just
    // added place vanishes on refresh" bug.
    //
    // Fix: read localStorage first. It is always the freshest copy.
    // Only fall back to Supabase if localStorage is EMPTY (new device, cleared
    // browser data). Supabase remains the cross-device backup, not the primary
    // read source.
    let addresses: AppState['savedAddresses'] = []
    if (authUser.id !== 'guest') {
      const localAddresses = loadSavedAddresses(authUser.id)
      // Diagnostic: log the raw localStorage state so we can see if it's been wiped externally.
      const rawLocal = (typeof localStorage !== 'undefined')
        ? localStorage.getItem(savedAddressesKey(authUser.id))
        : null
      console.log('[loadUserData] localStorage raw:', rawLocal === null ? 'NULL' : `len=${rawLocal.length}`, '— parsed count:', localAddresses.length)

      if (localAddresses.length > 0) {
        addresses = localAddresses
        console.log('[loadUserData] using localStorage:', localAddresses.length, 'places')
      } else if (isSupabaseConfigured) {
        // localStorage empty — try Supabase as fallback.
        try {
          const { data } = await supabase
            .from('profiles')
            .select('saved_addresses')
            .eq('id', authUser.id)
            .maybeSingle()
          const supaCount = Array.isArray(data?.saved_addresses) ? data.saved_addresses.length : 0
          console.log('[loadUserData] Supabase returned:', supaCount, 'places')
          if (Array.isArray(data?.saved_addresses) && data.saved_addresses.length > 0) {
            addresses = data.saved_addresses
            // Seed localStorage so future loads are instant.
            localStorage.setItem(savedAddressesKey(authUser.id), JSON.stringify(addresses))
            // Prime the wipe-guard with the loaded count so a buggy clear-to-0
            // right after load doesn't slip past the guard.
            prevAddrCountRef.current = addresses.length
          }
        } catch (err) {
          console.warn('[loadUserData] Supabase fetch failed', err)
        }
      }
      // If we loaded from localStorage, also prime the guard.
      if (addresses.length > 0) prevAddrCountRef.current = addresses.length
    }

    // Past deliveries: fetch from order store, map to legacy Delivery type
    let deliveries: Delivery[] = []
    if (authUser.id !== 'guest') {
      try {
        const orders = await getCustomerOrders(authUser.id)
        deliveries = orders.map(orderToDelivery)
      } catch {
        deliveries = []
      }
    }

    console.log('[loadUserData] setting savedAddresses + ref for', authUser.id, '— count:', addresses.length, 'labels:', addresses.map(a => a.label))
    setState(s => ({
      ...s,
      savedAddresses:  addresses,
      pastDeliveries:  deliveries,
      paymentMethods:  [],  // payment methods come from Stripe, not local state
    }))
    // Unlock the persist effect now that addresses have been hydrated.
    // Done after setState so the very next effect run sees both the new
    // addresses AND the ref pointing at the current user.
    savedAddrLoadedForRef.current = authUser.id
  }, [])

  // ── Auth session: Supabase is the single source of truth ────────────────────
  //
  // Strategy:
  //   • When Supabase is configured: onAuthStateChange drives ALL auth state.
  //     We never manually read/write cs_user or cs_token.
  //   • When Supabase is NOT configured (local dev fallback): read cs_user from
  //     localStorage (written by the Express /api/auth endpoints).
  //   • SIGNED_OUT clears every piece of local state immediately regardless of
  //     which path triggered the logout.
  //
  useEffect(() => {
    // Shared helper: apply a saved booking session if one exists.
    // On native (initial screen = 'auth'), always land on 'home' after session
    // restore so the user doesn't see the auth screen when already signed in.
    const applyRestoredSession = () => {
      const saved = restoreBookingSession()
      if (saved) { setScreen(saved.screen); setDraft(saved.draft) }
      else if (IS_NATIVE) setScreen('home')
    }

    if (!isSupabaseConfigured) {
      // ── Dev / no-Supabase fallback ──────────────────────────────────────────
      const stored = localStorage.getItem('cs_user')
      if (stored) {
        try {
          const authUser: AuthUser = JSON.parse(stored)
          if (authUser.id !== 'guest') {
            setUser(authUser)
            loadUserData(authUser)
            applyRestoredSession()
          }
        } catch {}
      }
      setAuthChecked(true)
      return
    }

    // ── Supabase mode ────────────────────────────────────────────────────────
    // onAuthStateChange fires immediately with INITIAL_SESSION (existing session
    // or null), then for every future sign-in / sign-out / token-refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] state change:', event, session?.user?.email ?? 'no user')

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (session?.user) {
            const authUser: AuthUser = {
              id:    session.user.id,
              email: session.user.email ?? '',
              name:  session.user.user_metadata?.name
                     ?? session.user.email?.split('@')[0]
                     ?? 'User',
            }
            setUser(authUser)
            userRef.current = authUser
            // Only restore a saved booking on initial page load, not on a fresh sign-in
            // where the user just completed auth and should land on home.
            if (event === 'INITIAL_SESSION') applyRestoredSession()
            setAuthChecked(true)
            loadUserData(authUser).catch(err =>
              console.error('[Auth] loadUserData failed during session restore', err)
            )
          } else {
            // No session — show the auth screen immediately.
            setAuthChecked(true)
          }

        } else if (event === 'SIGNED_OUT') {
          console.log('[Auth] SIGNED_OUT — clearing all user state')
          setUser(null)
          setState(INITIAL_STATE)
          setDraft(BLANK_DRAFT)
          setScreen('home')
          savedAddrLoadedForRef.current = null  // re-arm the persist guard
          loadingForUserRef.current = null      // allow loadUserData to fire on next login
    prevAddrCountRef.current = 0           // re-arm the wipe guard
          // Clear any lingering /tracking/:id URL so a re-login doesn't
          // accidentally restore an order the user may no longer have access to.
          if (window.location.pathname.startsWith('/tracking/')) {
            window.history.replaceState({}, '', '/')
          }
          setAuthChecked(true)

        } else if (event === 'PASSWORD_RECOVERY') {
          // User clicked the reset-password link in their email.
          // Supabase has already exchanged the token for a session — navigate
          // to the reset screen so they can choose a new password.
          setAuthChecked(true)
          setScreen('reset-password')

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Keep name/email in sync with latest metadata; don't reload data
          setUser({
            id:    session.user.id,
            email: session.user.email ?? '',
            name:  session.user.user_metadata?.name
                   ?? session.user.email?.split('@')[0]
                   ?? 'User',
          })
        }
      }
    )

    // Handle /auth/callback URL (email confirmation PKCE code exchange).
    // getSession() triggers the automatic code exchange when detectSessionInUrl
    // is true (the default). onAuthStateChange fires SIGNED_IN after exchange.
    const isCallback =
      window.location.pathname === '/auth/callback' ||
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=')

    if (isCallback) {
      supabase.auth.getSession().then(() => {
        window.history.replaceState({}, document.title, '/')
      })
    }

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Reconnect: re-fetch orders when coming back online ───────────────────────
  // Jitter (0–2s) spreads the burst across concurrent tabs/users.
  useEffect(() => {
    const onOnline = async () => {
      const authUser = userRef.current
      if (!authUser || authUser.id === 'guest') return
      await new Promise(r => setTimeout(r, Math.random() * 2000))
      // Bypass the dedup guard: reconnect SHOULD refresh from Supabase.
      loadingForUserRef.current = null
      loadUserData(authUser).catch(() => {})
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [loadUserData])

  // ── Geolocation city detection (non-blocking, runs once after configs load) ──
  useEffect(() => {
    // Pass current configs so detection aliases come from Supabase data
    detectCityFromGeolocation(configsRef.current).then((detectedCityId) => {
      if (detectedCityId && detectedCityId !== selectedCityRef.current) {
        setState(s => ({ ...s, selectedCityId: detectedCityId }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth ────────────────────────────────────────────────────────────────────
  const handleAuth = useCallback(async (authUser: AuthUser, _token: string) => {
    // For Supabase mode: setUser + loadUserData happen here for instant UI
    // feedback. onAuthStateChange SIGNED_IN also fires and is harmlessly
    // redundant (same data). For guest / non-Supabase, this is the only path.

    // Guest sessions always start fresh — never carry over previous guest state
    // or draft. Each "Continue as guest" click produces a clean slate.
    if (authUser.id === 'guest') {
      setState(INITIAL_STATE)
      setDraft(BLANK_DRAFT)
    }

    setUser(authUser)
    await loadUserData(authUser)
    // Honour tracking deep-link: if the URL still contains /tracking/:id the
    // user came here via a shared link and must be sent to tracking after auth.
    const deepId = parseTrackingId()
    if (deepId) {
      setTrackingOrderId(deepId)
      trackingOrderIdRef.current = deepId
      setScreen('tracking')
    } else {
      setScreen('home')
    }
  }, [loadUserData])

  const handleLogout = useCallback(async () => {
    const wasGuest = userRef.current?.id === 'guest'

    // Clear all local state immediately — UI snaps to landing/auth at once.
    setUser(null)
    setState(INITIAL_STATE)
    setDraft(BLANK_DRAFT)
    setScreen('home')
    setUnreadCount(0)
    navHistoryRef.current = []
    savedAddrLoadedForRef.current = null  // re-arm the persist guard
    loadingForUserRef.current = null      // allow loadUserData to fire on next login
    prevAddrCountRef.current = 0           // re-arm the wipe guard
    clearBookingSession()

    if (wasGuest) {
      // Guests never have a Supabase session — just wipe local state and return.
      // Also clear any non-Supabase dev tokens that might have been set.
      localStorage.removeItem('cs_token')
      localStorage.removeItem('cs_user')
      return
    }

    if (isSupabaseConfigured) {
      // Await so Supabase clears its own localStorage tokens before we return.
      // onAuthStateChange SIGNED_OUT will also fire but state is already null.
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem('cs_token')
      localStorage.removeItem('cs_user')
    }
  }, [])

  // ── Persist saved addresses to Supabase + localStorage mirror ───────────────
  // Guarded by savedAddrLoadedForRef — we only persist once loadUserData has
  // hydrated state.savedAddresses for this user. Without that gate the initial
  // empty state would be written to Supabase on every login/refresh, wiping
  // the user's real saved places.
  useEffect(() => {
    if (!user || user.id === 'guest') {
      console.log('[savedAddresses] effect: skip (no user)', { user: user?.id, count: state.savedAddresses.length })
      return
    }
    if (savedAddrLoadedForRef.current !== user.id) {
      console.log('[savedAddresses] effect: skip (not loaded yet)', { user: user.id, refUser: savedAddrLoadedForRef.current, count: state.savedAddresses.length })
      return
    }
    // Wipe guard: refuse to persist a sudden N>1 → 0 collapse. That pattern is
    // almost always a bug (auth race, state reset, etc.), not a real deletion.
    // Real deletes happen one at a time (N → N-1 → ...).
    const newCount  = state.savedAddresses.length
    const prevCount = prevAddrCountRef.current
    if (newCount === 0 && prevCount > 1) {
      console.warn('[savedAddresses] WIPE BLOCKED — refusing to persist sudden', prevCount, '→ 0 collapse. State will be re-hydrated from localStorage on next load.')
      // Do NOT update prevAddrCountRef so a legitimate retry can still go through.
      return
    }
    prevAddrCountRef.current = newCount
    console.log('[savedAddresses] effect: PERSIST', { user: user.id, count: newCount, prev: prevCount, origin: window.location.origin, places: state.savedAddresses.map(a => a.label) })
    // Always keep a local mirror for instant reads on next launch
    const key = savedAddressesKey(user.id)
    const value = JSON.stringify(state.savedAddresses)
    try {
      localStorage.setItem(key, value)
      // Immediate read-back to verify the write actually stuck.
      const readback = localStorage.getItem(key)
      if (readback === null) {
        console.error('[savedAddresses] localStorage WRITE LOST — readback is NULL. Storage is blocked or being cleared by something.')
      } else if (readback !== value) {
        console.error('[savedAddresses] localStorage MISMATCH after write', { wroteLen: value.length, readLen: readback.length })
      } else {
        console.log('[savedAddresses] localStorage write verified — key:', key)
      }
    } catch (err) {
      console.error('[savedAddresses] localStorage.setItem THREW', err)
    }
    // Sync to Supabase so the same account sees the same places on any device
    if (isSupabaseConfigured) {
      supabase
        .from('profiles')
        .update({ saved_addresses: state.savedAddresses })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.warn('[savedAddresses] sync failed', error.message)
          else console.log('[savedAddresses] persisted OK', state.savedAddresses.length, 'places')
        })
    }
  }, [state.savedAddresses, user])

  // ── City change (called by HomeScreen / SettingsScreen pickers) ─────────────
  const handleCityChange = useCallback((cityId: CityId) => {
    setState(s => ({ ...s, selectedCityId: cityId }))
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const go = useCallback((next: ScreenName, opts?: NavOptions) => {
    // ── Back navigation: pop the history stack ───────────────────────────────
    if (next === 'back') {
      const history = navHistoryRef.current
      if (history.length > 0) {
        const prev = history[history.length - 1]
        navHistoryRef.current = history.slice(0, -1)
        setScreen(prev)
      } else {
        // No history (e.g. direct deep-link or root tab) — fall back to home
        setScreen('home')
      }
      return
    }

    // Push current screen onto the history stack before navigating forward.
    // Skip pushing if navigating to the same screen (avoids stack pollution).
    const current = screenRef.current
    if (current !== next && current !== 'back') {
      navHistoryRef.current = [...navHistoryRef.current, current]
    }

    // City gate — block new-1 for non-live cities using live Supabase configs
    if (next === 'new-1' && !canStartOrder(selectedCityRef.current, configsRef.current)) {
      setScreen('city-blocked')
      return
    }

    // ── Tracking URL management ──────────────────────────────────────────────
    if (next === 'tracking') {
      // Tracking is a destination, not an intermediate step. Reset the back
      // stack so 'back' always goes home — never to the Payment screen we
      // came from. (Customers landing here after delivery should not be sent
      // back into a paid checkout flow.)
      navHistoryRef.current = ['home']
      // If a specific orderId is provided, update state + ref immediately so the
      // URL push below sees the new ID (can't wait for useEffect → ref sync).
      const newId = opts?.trackOrderId
      if (newId !== undefined) {
        setTrackingOrderId(newId)
        trackingOrderIdRef.current = newId
      }
      // Resolve the ID to embed in the URL: prefer the freshly-provided one,
      // then the existing ref (set synchronously by onPaymentComplete before
      // calling go('tracking') with no opts).
      const resolvedId = newId ?? trackingOrderIdRef.current
      if (resolvedId) {
        window.history.pushState({}, '', `/tracking/${encodeURIComponent(resolvedId)}`)
      }
    } else {
      // Leaving any tracking URL → restore root so deep-link state is clean.
      if (window.location.pathname.startsWith('/tracking/')) {
        window.history.replaceState({}, '', '/')
      }
    }

    // Prefill draft for "Send again" / saved-address shortcuts
    if (opts?.prefill) {
      setDraft({
        ...BLANK_DRAFT,
        dropoff: {
          address: opts.prefill.to.address,
          name:    opts.prefill.to.name,
          phone:   opts.prefill.to.phone ?? '',
          note:    '',
        },
      })
    }

    // Reset draft when returning home
    if (next === 'home') {
      setTimeout(() => setDraft(BLANK_DRAFT), 300)
    }

    // Registered users navigating to 'auth' → redirect home (e.g. after ForgotPassword).
    // Guests navigating to 'auth' → allow, so they can convert to a registered account.
    const isRegistered = userRef.current && userRef.current.id !== 'guest'
    setScreen(next === 'auth' && isRegistered ? 'home' : next)
  }, [])

  // ── Payment completion ──────────────────────────────────────────────────────
  const onPaymentComplete = useCallback(async (tip: number, authorizedTotal?: number) => {
    const now      = new Date().toISOString()
    // Collision-resistant ID: 6 random base-36 chars ≈ 2.2 billion combinations
    const randPart = Math.random().toString(36).slice(2, 8).toUpperCase()
    const orderId  = `CS-${randPart}`
    const cityConf = getCityConfig(state.selectedCityId, configsRef.current)
    const distKm   = draft.route ? Math.round(draft.route.distanceM / 100) / 10 : 5
    const breakdown = computeOrderPrice({
      cityConfig: cityConf,
      distKm,
      parcelSize: draft.parcel.size,
      fragile:    draft.parcel.fragile,
      tip,
    })
    // If the server returned an authoritative total, trust it over the client-computed value
    if (authorizedTotal !== undefined) breakdown.total = authorizedTotal

    const newDelivery: Delivery = {
      id:     orderId.replace(/^CS-/, ''),
      to:     {
        name:    draft.dropoff.name    || 'Recipient',
        address: draft.dropoff.address || '—',
        phone:   draft.dropoff.phone,
      },
      date:           new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      price:          breakdown.total.toFixed(2),
      status:         'in-transit' as const,
      when:           'Today',
      priceBreakdown: breakdown,
    }

    // Set tracking order so the next go('tracking') call shows this order.
    // Also update the ref immediately: PaymentScreen calls go('tracking') with
    // no opts in the same synchronous turn, so go() needs the ref to be current
    // before the useEffect that normally keeps it in sync has a chance to run.
    setTrackingOrderId(orderId)
    trackingOrderIdRef.current = orderId

    // Write to shared order store (Supabase or localStorage).
    // pushNewOrder throws on failure — the PaymentScreen caller catches and surfaces the error.
    await pushNewOrder({
      id: orderId,
      customerId:   user?.id ?? 'guest',
      customerName: user?.name ?? (draft.pickup.name || 'Customer'),
      pickup: {
        name:    draft.pickup.name,
        phone:   draft.pickup.phone,
        address: draft.pickup.address,
        unit:    draft.pickup.unit || undefined,
      },
      dropoff: {
        name:    draft.dropoff.name,
        phone:   draft.dropoff.phone,
        address: draft.dropoff.address,
        note:    draft.dropoff.note || undefined,
      },
      parcel: {
        size:    draft.parcel.size,
        desc:    draft.parcel.desc,
        fragile: draft.parcel.fragile,
        prohibitedItemsDeclarationAccepted:   draft.parcel.prohibitedItemsDeclarationAccepted,
        prohibitedItemsDeclarationAcceptedAt: draft.parcel.prohibitedItemsDeclarationAcceptedAt ?? now,
      },
      status: 'new',
      priceBreakdown: breakdown,
      cityId:     state.selectedCityId,
      distanceKm: distKm,
      createdAt: now,
      updatedAt: now,
      notes: [],
    })

    // Push order_created notification
    await pushCustomerNotif({
      event:      'order_created',
      audience:   'customer',
      orderId,
      title:      'Delivery request submitted',
      body:       `Your parcel to ${draft.dropoff.name} is being matched with a driver.`,
      customerId: user?.id,
    })

    setState(s => ({ ...s, pastDeliveries: [newDelivery, ...s.pastDeliveries] }))
  }, [draft, state.pastDeliveries, state.selectedCityId, user])

  // ── Screen renderer ─────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case 'auth':
        return <AuthScreen onAuth={handleAuth} go={go} />
      case 'forgot-password':
        return <ForgotPasswordScreen go={go} />
      case 'reset-password':
        return <ResetPasswordScreen go={go} />
      case 'home':
        return (
          <HomeScreen
            go={go}
            state={state}
            user={user}
            cityConfig={cityConfig}
            configs={configs}
            onCityChange={handleCityChange}
            unreadCount={unreadCount}
          />
        )
      case 'new-1':
      case 'new-2':
      case 'new-3':
        return (
          <NewRequestScreen
            step={screen}
            go={go}
            state={state}
            draft={draft}
            setDraft={setDraft}
            cityConfig={cityConfig}
            user={user}
          />
        )
      case 'pricing':
        return (
          <PricingScreen
            go={go}
            draft={draft}
            setDraft={setDraft}
            cityConfig={cityConfig}
          />
        )
      case 'pay':
        return <PaymentScreen go={go} state={state} draft={draft} cityConfig={cityConfig} onPaymentComplete={onPaymentComplete} />
      case 'tracking':
        return <TrackingScreen go={go} draft={draft} cityConfig={cityConfig} orderId={trackingOrderId} user={user} />
      case 'history':
        return <HistoryScreen go={go} state={state} user={user} />
      case 'billing':
        return <BillingScreen go={go} state={state} user={user} />
      case 'notifications':
        return (
          <NotificationsScreen
            go={go}
            user={user}
            notifVersion={notifVersion}
            onRead={() => setNotifVersion(v => v + 1)}
          />
        )
      case 'profile':
        return <ProfileScreen go={go} user={user!} state={state} onLogout={handleLogout} />
      case 'settings':
        return (
          <SettingsScreen
            go={go}
            state={state}
            setState={setState}
            onCityChange={handleCityChange}
            configs={configs}
            user={user}
          />
        )
      case 'add-place':
        return <AddPlaceScreen go={go} setState={setState} user={user} />
      case 'city-blocked':
        return <CityBlockedScreen go={go} cityConfig={cityConfig} configs={configs} />
      case 'privacy':
        return <PrivacyScreen go={go} />
      case 'terms':
        return <TermsScreen go={go} />
      default:
        return <HomeScreen go={go} state={state} user={user} cityConfig={cityConfig} configs={configs} onCityChange={handleCityChange} />
    }
  }

  // ── Production Supabase gate ────────────────────────────────────────────────
  // In production builds, refuse to run without real credentials so testers
  // never accidentally interact with a mock-only instance.
  if (import.meta.env.PROD && !isSupabaseConfigured) {
    return (
      <div className="cs-shell">
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
          background: 'var(--cs-paper)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>⚙️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cs-ink)', letterSpacing: -0.5 }}>
            Backend not configured
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', lineHeight: 1.6, maxWidth: 280 }}>
            Set <code style={{ fontFamily: 'var(--cs-mono)', background: 'var(--cs-slate-100)', padding: '1px 5px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> and{' '}
            <code style={{ fontFamily: 'var(--cs-mono)', background: 'var(--cs-slate-100)', padding: '1px 5px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code>{' '}
            in your Vercel project environment variables, then redeploy.
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-400)', marginTop: 8 }}>
            See SUPABASE_SETUP.md for credentials
          </div>
        </div>
      </div>
    )
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (!authChecked) return null

  if (!user) {
    // Dedicated auth screens stay inside the phone shell
    if (screen === 'forgot-password') {
      return <div className="cs-shell"><ForgotPasswordScreen go={go} /></div>
    }
    if (screen === 'reset-password') {
      return <div className="cs-shell"><ResetPasswordScreen go={go} /></div>
    }
    if (screen === 'privacy') return <PrivacyScreen go={go} />
    if (screen === 'terms')   return <TermsScreen go={go} />
    if (screen === 'about')   return <AboutScreen go={go} />
    if (screen === 'auth') {
      return <div className="cs-shell"><AuthScreen onAuth={handleAuth} go={go} /></div>
    }
    // Native app: skip marketing landing page, go straight to auth
    if (IS_NATIVE) return <div className="cs-shell"><AuthScreen onAuth={handleAuth} go={go} /></div>
    // Web: show the full-width marketing landing page
    return <LandingScreen go={go} />
  }

  // Full-page screens that must render outside the phone shell
  if (screen === 'privacy') return <PrivacyScreen go={go} />
  if (screen === 'terms')   return <TermsScreen go={go} />
  if (screen === 'about')   return <AboutScreen go={go} />

  return (
    <div className="cs-shell">
      {renderScreen()}
      {TAB_SCREENS.includes(screen) && <TabBar screen={screen} go={go} unreadCount={unreadCount} />}
    </div>
  )
}
