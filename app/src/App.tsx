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
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen'
import { ProfileScreen }       from './screens/ProfileScreen'
import { SettingsScreen }      from './screens/SettingsScreen'
import { AddPlaceScreen }      from './screens/AddPlaceScreen'
import { CityBlockedScreen }   from './screens/CityBlockedScreen'
import { TabBar }              from './components/TabBar'
import { BLANK_DRAFT, INITIAL_STATE } from './data/mock'
import { getCityConfig, getCityConfigByDetectedName, computeOrderPrice, canStartOrder } from './utils/serviceAvailability'
import { fetchCityConfigs, subscribeToCityConfigs } from './utils/configStore'
import { pushNewOrder, getCustomerOrders, type CustomerOrder } from './utils/orderStore'
import { pushCustomerNotif, NOTIFS_STORAGE_KEY, subscribeToCustomerNotifs } from './utils/notificationStore'
import { supabase, isSupabaseConfigured } from './lib/supabase'
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
    assigned:   'in-transit',
    picked_up:  'in-transit',
    in_transit: 'in-transit',
    delivered:  'delivered',
    cancelled:  'canceled',
  }

  // Strip the 'CS-' prefix to get the numeric ID the UI expects
  const numericId = o.id.replace(/^CS-/, '')

  return {
    id:     numericId,
    to:     { name: o.dropoff.name, address: o.dropoff.address, phone: o.dropoff.phone },
    date,
    price:  o.priceBreakdown?.total?.toFixed(2) ?? '0.00',
    status: statusMap[o.status] ?? 'in-transit',
    when,
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Initialise screen + trackingOrderId from the URL so that a hard-refresh
  // of /tracking/:orderId lands on the correct screen without a redirect.
  const [screen,          setScreen]          = useState<ScreenName>(() =>
    parseTrackingId() ? 'tracking' : 'home',
  )
  const [state,           setState]           = useState<AppState>(INITIAL_STATE)
  const [draft,           setDraft]           = useState<Draft>(BLANK_DRAFT)
  const [user,            setUser]            = useState<AuthUser | null>(null)
  const [authChecked,     setAuthChecked]     = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(
    () => parseTrackingId(),
  )

  // Refs so go() callback is never stale
  const userRef            = useRef<AuthUser | null>(null)
  const selectedCityRef    = useRef<CityId>(INITIAL_STATE.selectedCityId)
  const configsRef         = useRef<CityConfig[]>(CITY_CONFIGS)
  // trackingOrderIdRef keeps the current orderId instantly available inside go()
  // without waiting for a useEffect — required for the payment-flow handoff where
  // onPaymentComplete sets the ID and go('tracking') fires synchronously after.
  const trackingOrderIdRef = useRef<string | undefined>(parseTrackingId())
  useEffect(() => { userRef.current    = user },                       [user])
  useEffect(() => { selectedCityRef.current = state.selectedCityId },  [state.selectedCityId])
  useEffect(() => { trackingOrderIdRef.current = trackingOrderId },    [trackingOrderId])

  // ── City configs — Supabase as single source of truth ───────────────────────
  // Initialised with compile-time defaults so the UI renders immediately.
  // Replaced with Supabase data on first fetch, then kept in sync via realtime.
  const [configs, setConfigs] = useState<CityConfig[]>(CITY_CONFIGS)
  useEffect(() => { configsRef.current = configs }, [configs])

  // notifVersion bumps whenever new notifications arrive (cross-tab / realtime)
  const [notifVersion, setNotifVersion] = useState(0)

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

  // ── Load user-specific data (addresses from localStorage, orders from Supabase) ─
  const loadUserData = useCallback(async (authUser: AuthUser) => {
    // Addresses: user-scoped localStorage
    const addresses = authUser.id !== 'guest' ? loadSavedAddresses(authUser.id) : []

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

    setState(s => ({
      ...s,
      savedAddresses:  addresses,
      pastDeliveries:  deliveries,
      paymentMethods:  [],  // payment methods come from Stripe, not local state
    }))
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
    if (!isSupabaseConfigured) {
      // ── Dev / no-Supabase fallback ──────────────────────────────────────────
      const stored = localStorage.getItem('cs_user')
      if (stored) {
        try {
          const authUser: AuthUser = JSON.parse(stored)
          setUser(authUser)
          loadUserData(authUser)
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
            // Unblock the app immediately — user is confirmed, render now.
            // loadUserData fetches past orders and runs in the background;
            // it does NOT gate rendering so a slow/failed DB query never
            // causes a permanent blank screen.
            setUser(authUser)
            userRef.current = authUser
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
          // Clear any lingering /tracking/:id URL so a re-login doesn't
          // accidentally restore an order the user may no longer have access to.
          if (window.location.pathname.startsWith('/tracking/')) {
            window.history.replaceState({}, '', '/')
          }
          setAuthChecked(true)

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
    // Clear state immediately so the UI snaps to the auth screen at once.
    setUser(null)
    setState(INITIAL_STATE)
    setDraft(BLANK_DRAFT)
    setScreen('home')

    if (isSupabaseConfigured) {
      // Await so Supabase clears its own localStorage tokens before we return.
      // onAuthStateChange SIGNED_OUT will also fire but state is already null.
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem('cs_token')
      localStorage.removeItem('cs_user')
    }
  }, [])

  // ── Persist saved addresses to user-scoped localStorage ─────────────────────
  useEffect(() => {
    if (!user || user.id === 'guest') return
    localStorage.setItem(savedAddressesKey(user.id), JSON.stringify(state.savedAddresses))
  }, [state.savedAddresses, user])

  // ── City change (called by HomeScreen / SettingsScreen pickers) ─────────────
  const handleCityChange = useCallback((cityId: CityId) => {
    setState(s => ({ ...s, selectedCityId: cityId }))
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const go = useCallback((next: ScreenName, opts?: NavOptions) => {
    // City gate — block new-1 for non-live cities using live Supabase configs
    if (next === 'new-1' && !canStartOrder(selectedCityRef.current, configsRef.current)) {
      setScreen('city-blocked')
      return
    }

    // ── Tracking URL management ──────────────────────────────────────────────
    if (next === 'tracking') {
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

    // Already logged in + navigating to auth → redirect home (e.g. from ForgotPassword)
    setScreen(next === 'auth' && userRef.current ? 'home' : next)
  }, [])

  // ── Payment completion ──────────────────────────────────────────────────────
  const onPaymentComplete = useCallback(async (tip: number) => {
    const now       = new Date().toISOString()
    const orderId   = `CS-${Date.now().toString().slice(-5)}`
    const cityConf  = getCityConfig(state.selectedCityId, configsRef.current)
    const distKm    = draft.route ? Math.round(draft.route.distanceM / 100) / 10 : 5
    const breakdown = computeOrderPrice({
      cityConfig: cityConf,
      distKm,
      parcelSize: draft.parcel.size,
      fragile:    draft.parcel.fragile,
      tip,
    })

    const newDelivery: Delivery = {
      id:     orderId.replace(/^CS-/, ''),
      to:     {
        name:    draft.dropoff.name    || 'Recipient',
        address: draft.dropoff.address || '—',
        phone:   draft.dropoff.phone,
      },
      date:   new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      price:  breakdown.total.toFixed(2),
      status: 'in-transit' as const,
      when:   'Today',
    }

    // Set tracking order so the next go('tracking') call shows this order.
    // Also update the ref immediately: PaymentScreen calls go('tracking') with
    // no opts in the same synchronous turn, so go() needs the ref to be current
    // before the useEffect that normally keeps it in sync has a chance to run.
    setTrackingOrderId(orderId)
    trackingOrderIdRef.current = orderId

    // Write to shared order store (Supabase or localStorage)
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
      case 'home':
        return (
          <HomeScreen
            go={go}
            state={state}
            user={user}
            cityConfig={cityConfig}
            configs={configs}
            onCityChange={handleCityChange}
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
        return <HistoryScreen go={go} state={state} />
      case 'billing':
        return <BillingScreen go={go} state={state} />
      case 'notifications':
        return <NotificationsScreen go={go} user={user} notifVersion={notifVersion} />
      case 'profile':
        return <ProfileScreen go={go} user={user!} state={state} />
      case 'settings':
        return (
          <SettingsScreen
            go={go}
            onLogout={handleLogout}
            state={state}
            setState={setState}
            onCityChange={handleCityChange}
            configs={configs}
          />
        )
      case 'add-place':
        return <AddPlaceScreen go={go} setState={setState} />
      case 'city-blocked':
        return <CityBlockedScreen go={go} cityConfig={cityConfig} configs={configs} />
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

  if (!user) return (
    <div className="cs-shell">
      {screen === 'forgot-password'
        ? <ForgotPasswordScreen go={go} />
        : <AuthScreen onAuth={handleAuth} go={go} />
      }
    </div>
  )

  return (
    <div className="cs-shell">
      {renderScreen()}
      {TAB_SCREENS.includes(screen) && <TabBar screen={screen} go={go} />}
    </div>
  )
}
