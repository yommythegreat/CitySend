import React, { useState, useEffect } from 'react'
import { DriverProvider, useDriver, signOutDriver } from './store/DriverContext'
import { LoginScreen }            from './screens/LoginScreen'
import { DriverSignupScreen }     from './screens/DriverSignupScreen'
import { DashboardScreen }        from './screens/DashboardScreen'
import { DeliveryScreen }         from './screens/DeliveryScreen'
import { ProofOfDeliveryScreen }  from './screens/ProofOfDeliveryScreen'
import { EarningsScreen }         from './screens/EarningsScreen'
import { HistoryScreen }          from './screens/HistoryScreen'
import { JobOfferModal }          from './components/JobOfferModal'

// ── Screen types ──────────────────────────────────────────────────────────────

type Screen =
  | { name: 'dashboard' }
  | { name: 'delivery';  orderId: string; chatOpen?: boolean }
  | { name: 'proof';     orderId: string }
  | { name: 'earnings';  orderId: string }
  | { name: 'history' }

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
    default:         return 'dashboard'
  }
}

// ── Inner app (needs DriverProvider) ─────────────────────────────────────────

function DriverApp() {
  const { state, dispatch, jobOffer } = useDriver()

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
    const orderId = jobOffer.order.id
    dispatch({ type: 'HIDE_JOB_OFFER' })
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
      return (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 14px', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 10, background: 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            Sign out
          </button>
        </div>
      )
    }

    if (screen.name === 'history') {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '52px 16px 12px',
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
