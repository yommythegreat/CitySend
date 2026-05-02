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
import { INITIAL_DRAFT, BLANK_DRAFT, INITIAL_STATE } from './data/mock'
import { getCityConfig, getCityConfigByDetectedName, computeOrderPrice } from './utils/serviceAvailability'
import { canStartOrder } from './utils/serviceAvailability'
import { pushNewOrder } from './utils/orderStore'
import { pushCustomerNotif, NOTIFS_STORAGE_KEY, subscribeToCustomerNotifs } from './utils/notificationStore'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { ScreenName, Draft, AppState, NavOptions, AuthUser, CityId } from './types'

const TAB_SCREENS: ScreenName[] = ['home', 'history', 'notifications']

// ── Environment badge ─────────────────────────────────────────────────────────

function EnvBadge() {
  const connected = isSupabaseConfigured
  return (
    <div style={{
      position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 99,
        fontSize: 10, fontFamily: 'var(--cs-mono)', letterSpacing: 0.5, fontWeight: 500,
        background: connected ? 'rgba(22,120,66,.08)' : 'rgba(168,92,0,.10)',
        color:      connected ? '#167842'             : '#a85c00',
        border:     `1px solid ${connected ? 'rgba(22,120,66,.18)' : 'rgba(168,92,0,.22)'}`,
        backdropFilter: 'blur(6px)',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
        {connected ? 'Supabase connected' : 'Mock mode — local data only'}
      </div>
    </div>
  )
}

// ── Geolocation city detection ────────────────────────────────────────────────

async function detectCityFromGeolocation(): Promise<CityId | null> {
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
          const config = rawCity ? getCityConfigByDetectedName(rawCity) : undefined
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

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,          setScreen]          = useState<ScreenName>('home')
  const [state,           setState]           = useState<AppState>(INITIAL_STATE)
  const [draft,           setDraft]           = useState<Draft>(INITIAL_DRAFT)
  const [user,            setUser]            = useState<AuthUser | null>(null)
  const [authChecked,     setAuthChecked]     = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined)

  // Refs so go() callback is never stale
  const userRef          = useRef<AuthUser | null>(null)
  const selectedCityRef  = useRef<CityId>(INITIAL_STATE.selectedCityId)
  useEffect(() => { userRef.current = user },                      [user])
  useEffect(() => { selectedCityRef.current = state.selectedCityId }, [state.selectedCityId])

  // configVersion bumps whenever the admin panel writes new city configs to
  // localStorage, forcing cityConfig to be re-derived from the updated data.
  const [configVersion, setConfigVersion] = useState(0)
  // notifVersion bumps whenever new notifications arrive (cross-tab)
  const [notifVersion, setNotifVersion]   = useState(0)

  useEffect(() => {
    // Legacy localStorage listener (when Supabase is not configured)
    const legacyHandler = (e: StorageEvent) => {
      if (e.key === 'cs_city_configs_v1') setConfigVersion(v => v + 1)
      if (e.key === NOTIFS_STORAGE_KEY)   setNotifVersion(v => v + 1)
    }
    window.addEventListener('storage', legacyHandler)

    // Supabase realtime: bump notifVersion when new notifications arrive
    const unsubNotifs = subscribeToCustomerNotifs(
      userRef.current?.id,
      (_notif) => setNotifVersion(v => v + 1),
    )

    return () => {
      window.removeEventListener('storage', legacyHandler)
      unsubNotifs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive city config from selectedCityId (re-derived on admin config changes)
  const cityConfig = useMemo(
    () => getCityConfig(state.selectedCityId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.selectedCityId, configVersion],
  )

  // ── Session restore ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const authUser = {
            id:    session.user.id,
            email: session.user.email ?? '',
            name:  session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
          }
          setUser(authUser)
          localStorage.setItem('cs_user',  JSON.stringify(authUser))
          localStorage.setItem('cs_token', session.access_token)
        }
      } else {
        const stored = localStorage.getItem('cs_user')
        const token  = localStorage.getItem('cs_token')
        if (stored && token) {
          try { setUser(JSON.parse(stored)) } catch {}
        }
      }
      setAuthChecked(true)
    }
    restoreSession()
  }, [])

  // ── Geolocation city detection (non-blocking, runs once) ────────────────────
  useEffect(() => {
    detectCityFromGeolocation().then((detectedCityId) => {
      if (detectedCityId && detectedCityId !== state.selectedCityId) {
        setState(s => ({ ...s, selectedCityId: detectedCityId }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth ────────────────────────────────────────────────────────────────────
  const handleAuth = useCallback((authUser: AuthUser, _token: string) => {
    setUser(authUser)
    setScreen('home')
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('cs_token')
    localStorage.removeItem('cs_user')
    setUser(null)
    setScreen('home')
    setDraft(INITIAL_DRAFT)
  }, [])

  // ── City change (called by HomeScreen / SettingsScreen pickers) ─────────────
  const handleCityChange = useCallback((cityId: CityId) => {
    setState(s => ({ ...s, selectedCityId: cityId }))
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const go = useCallback((next: ScreenName, opts?: NavOptions) => {
    // City gate — block new-1 for non-live cities using the config layer
    if (next === 'new-1' && !canStartOrder(selectedCityRef.current)) {
      setScreen('city-blocked')
      return
    }

    // Capture trackOrderId so TrackingScreen knows which order to load
    if (next === 'tracking') {
      setTrackingOrderId(opts?.trackOrderId)
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
      setTimeout(() => setDraft(INITIAL_DRAFT), 300)
    }

    // Already logged in + navigating to auth → redirect home (e.g. from ForgotPassword)
    setScreen(next === 'auth' && userRef.current ? 'home' : next)
  }, [])

  // ── Payment completion ──────────────────────────────────────────────────────
  const onPaymentComplete = useCallback(async () => {
    const now       = new Date().toISOString()
    const orderId   = `CS-${Date.now().toString().slice(-5)}`
    const cityConf  = getCityConfig(state.selectedCityId)
    const distKm    = draft.route ? Math.round(draft.route.distanceM / 100) / 10 : 5
    const breakdown = computeOrderPrice({
      cityConfig: cityConf,
      distKm,
      parcelSize: draft.parcel.size,
      fragile:    draft.parcel.fragile,
      tip:        0,
    })

    const newDelivery = {
      id:     String(parseInt(state.pastDeliveries[0]?.id ?? '2900') + 1),
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

    // Set tracking order so the next go('tracking') call shows this order
    setTrackingOrderId(orderId)

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
      parcel: draft.parcel,
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
        return <PaymentScreen go={go} state={state} onPaymentComplete={onPaymentComplete} />
      case 'tracking':
        return <TrackingScreen go={go} draft={draft} cityConfig={cityConfig} orderId={trackingOrderId} />
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
          />
        )
      case 'add-place':
        return <AddPlaceScreen go={go} setState={setState} />
      case 'city-blocked':
        return <CityBlockedScreen go={go} cityConfig={cityConfig} />
      default:
        return <HomeScreen go={go} state={state} user={user} cityConfig={cityConfig} onCityChange={handleCityChange} />
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
      <EnvBadge />
    </div>
  )

  return (
    <div className="cs-shell">
      {renderScreen()}
      {TAB_SCREENS.includes(screen) && <TabBar screen={screen} go={go} />}
      <EnvBadge />
    </div>
  )
}
