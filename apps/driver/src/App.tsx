import React, { useState, useEffect } from 'react'
import { DriverProvider, useDriver, signOutDriver } from './store/DriverContext'
import { LoginScreen }            from './screens/LoginScreen'
import { DriverSignupScreen }     from './screens/DriverSignupScreen'
import { DashboardScreen }        from './screens/DashboardScreen'
import { DeliveryScreen }         from './screens/DeliveryScreen'
import { ProofOfDeliveryScreen }  from './screens/ProofOfDeliveryScreen'
import { EarningsScreen }         from './screens/EarningsScreen'
import { HistoryScreen }          from './screens/HistoryScreen'
import { DriverProfileScreen }    from './screens/DriverProfileScreen'
import { JobOfferModal }          from './components/JobOfferModal'

// ── Screen types ──────────────────────────────────────────────────────────────

type Screen =
  | { name: 'dashboard' }
  | { name: 'delivery';  orderId: string; chatOpen?: boolean }
  | { name: 'proof';     orderId: string }
  | { name: 'earnings';  orderId: string }
  | { name: 'history' }
  | { name: 'profile' }

// ── Hash-based routing ────────────────────────────────────────────────────────
// Format: #screen[/orderId[/sub]]
// Examples:
//   #dashboard
//   #delivery/CS-1234
//   #delivery/CS-1234/messages   ← opens chat immediately
//   #proof/CS-1234
//   #earnings/CS-1234
//   #history

function parseHash(): Screen {
  const hash  = window.location.hash.replace(/^#\/?/, '')  // strip leading #/
  if (!hash)  return { name: 'dashboard' }
  const parts = hash.split('/')
  const [seg0, seg1, seg2] = parts
  switch (seg0) {
    case 'delivery':
      if (!seg1) return { name: 'dashboard' }
      return { name: 'delivery', orderId: decodeURIComponent(seg1), chatOpen: seg2 === 'messages' }
    case 'proof':
      if (!seg1) return { name: 'dashboard' }
      return { name: 'proof', orderId: decodeURIComponent(seg1) }
    case 'earnings':
      if (!seg1) return { name: 'dashboard' }
      return { name: 'earnings', orderId: decodeURIComponent(seg1) }
    case 'history':
      return { name: 'history' }
    case 'profile':
      return { name: 'profile' }
    default:
      return { name: 'dashboard' }
  }
}

function screenToHash(screen: Screen): string {
  switch (screen.name) {
    case 'delivery':
      return screen.chatOpen
        ? `delivery/${encodeURIComponent(screen.orderId)}/messages`
        : `delivery/${encodeURIComponent(screen.orderId)}`
    case 'proof':    return `proof/${encodeURIComponent(screen.orderId)}`
    case 'earnings': return `earnings/${encodeURIComponent(screen.orderId)}`
    case 'history':  return 'history'
    case 'profile':  return 'profile'
    default:         return 'dashboard'
  }
}

// ── Inner app (needs DriverProvider) ─────────────────────────────────────────

function DriverApp() {
  const { state, dispatch, jobOffer, syncError, clearSyncError } = useDriver()

  // Restore screen from hash on first load; default to dashboard
  const [screen, setScreen] = useState<Screen>(() => parseHash())

  // Keep URL hash in sync with screen state
  useEffect(() => {
    const hash = screenToHash(screen)
    if (window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, '', `#${hash}`)
    }
  }, [screen])

  // Handle browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const next = parseHash()
      setScreen(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const [showSignup, setShowSignup] = useState(false)

  if (!state.auth) {
    if (showSignup) {
      return <DriverSignupScreen onBackToLogin={() => setShowSignup(false)} />
    }
    return <LoginScreen onSignUp={() => setShowSignup(true)} />
  }

  const handleLogout = async () => {
    dispatch({ type: 'LOGOUT' })
    setScreen({ name: 'dashboard' })
    await signOutDriver()
  }

  // Navigate helper — pushes a new history entry so back button works
  const navigateTo = (next: Screen) => {
    setScreen(next)
    window.history.pushState(null, '', `#${screenToHash(next)}`)
  }

  // ── Job offer handlers ───────────────────────────────────────────────────

  const handleAcceptOffer = () => {
    if (!jobOffer) return
    const orderId  = jobOffer.order.id
    const driverId = state.auth?.driverId ?? ''
    dispatch({ type: 'ACCEPT_JOB', orderId, driverId })
    dispatch({ type: 'HIDE_JOB_OFFER', accepted: true })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'accepted' })
    navigateTo({ name: 'delivery', orderId })
  }

  const handleDeclineOffer = () => {
    dispatch({ type: 'HIDE_JOB_OFFER' })
  }

  const handleOfferTimeout = () => {
    dispatch({ type: 'HIDE_JOB_OFFER' })
  }

  // ── Topbar (dashboard + history only — delivery/earnings are fullscreen) ──

  const renderTopBar = () => {
    if (screen.name === 'dashboard') {
      return null  // profile avatar lives inside DashboardScreen's DarkHeader
    }

    if (screen.name === 'history') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
          paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
          background: '#1a1a1a', color: '#fff', flexShrink: 0,
        }}>
          <button
            onClick={() => navigateTo({ name: 'dashboard' })}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Delivery History</div>
        </div>
      )
    }

    return null
  }

  // ── Screen renderer ──────────────────────────────────────────────────────

  const renderScreen = () => {
    switch (screen.name) {
      case 'dashboard':
        return (
          <DashboardScreen
            onSelectOrder={orderId => navigateTo({ name: 'delivery', orderId })}
            onGoHistory={() => navigateTo({ name: 'history' })}
            onGoProfile={() => navigateTo({ name: 'profile' })}
          />
        )

      case 'delivery':
        return (
          <DeliveryScreen
            orderId={screen.orderId}
            initialChatOpen={screen.chatOpen}
            onBack={() => navigateTo({ name: 'dashboard' })}
            onComplete={orderId => navigateTo({ name: 'proof', orderId })}
          />
        )

      case 'proof':
        return (
          <ProofOfDeliveryScreen
            orderId={screen.orderId}
            onBack={() => navigateTo({ name: 'delivery', orderId: screen.orderId })}
            onConfirmed={() => navigateTo({ name: 'earnings', orderId: screen.orderId })}
          />
        )

      case 'earnings': {
        const order = state.orders.find(o => o.id === screen.orderId)
        if (!order) {
          // Orders may not be loaded yet — wait rather than redirect
          return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--d-muted)' }}>
              Loading…
            </div>
          )
        }
        return (
          <EarningsScreen
            order={order}
            onContinue={() => navigateTo({ name: 'dashboard' })}
          />
        )
      }

      case 'history':
        return (
          <HistoryScreen
            onSelectOrder={orderId => navigateTo({ name: 'delivery', orderId })}
          />
        )

      case 'profile':
        return (
          <DriverProfileScreen
            onBack={() => navigateTo({ name: 'dashboard' })}
            onSignOut={handleLogout}
          />
        )
    }
  }

  const isFullscreen = screen.name === 'delivery' || screen.name === 'earnings'

  return (
    <div className={isFullscreen ? undefined : 'd-shell'}>
      {renderTopBar()}
      {renderScreen()}

      {/* ── Global job offer modal (shows on any screen) ────────────────── */}
      {jobOffer?.showModal && (
        <JobOfferModal
          order={jobOffer.order}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
          onTimeout={handleOfferTimeout}
        />
      )}

      {/* ── Sync error banner (write failed after 3 retries) ─────────────── */}
      {syncError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: '#dc2626', color: '#fff',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
            ⚠️ {syncError.message}
          </span>
          <button
            onClick={() => { syncError.retry(); clearSyncError() }}
            style={{
              padding: '5px 12px', background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}
          >
            Retry
          </button>
          <button
            onClick={clearSyncError}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0,
            }}
          >×</button>
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <DriverProvider>
      <DriverApp />
    </DriverProvider>
  )
}
