import React, { useState } from 'react'
import { DriverProvider, useDriver, signOutDriver } from './store/DriverContext'
import { LoginScreen }            from './screens/LoginScreen'
import { DashboardScreen }        from './screens/DashboardScreen'
import { DeliveryScreen }         from './screens/DeliveryScreen'
import { ProofOfDeliveryScreen }  from './screens/ProofOfDeliveryScreen'
import { EarningsScreen }         from './screens/EarningsScreen'
import { HistoryScreen }          from './screens/HistoryScreen'
import { JobOfferModal }          from './components/JobOfferModal'

// ── Screen types ──────────────────────────────────────────────────────────────

type Screen =
  | { name: 'dashboard' }
  | { name: 'delivery';  orderId: string }
  | { name: 'proof';     orderId: string }
  | { name: 'earnings';  orderId: string }
  | { name: 'history' }

// ── Inner app (needs DriverProvider) ─────────────────────────────────────────

function DriverApp() {
  const { state, dispatch, jobOffer } = useDriver()
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' })

  if (!state.auth) return <LoginScreen />

  const handleLogout = async () => {
    dispatch({ type: 'LOGOUT' })
    setScreen({ name: 'dashboard' })
    await signOutDriver()
  }

  // ── Job offer handlers ───────────────────────────────────────────────────

  const handleAcceptOffer = () => {
    if (!jobOffer) return
    const orderId = jobOffer.order.id
    dispatch({ type: 'HIDE_JOB_OFFER' })
    dispatch({ type: 'SET_SUBSTEP', orderId, substep: 'accepted' })
    setScreen({ name: 'delivery', orderId })
  }

  const handleDeclineOffer = () => {
    dispatch({ type: 'HIDE_JOB_OFFER' })
  }

  const handleOfferTimeout = () => {
    dispatch({ type: 'HIDE_JOB_OFFER' })
  }

  // ── Topbar (only for history screen now — delivery is fullscreen) ─────────

  const renderTopBar = () => {
    if (screen.name === 'dashboard') {
      // Dashboard has its own header; show sign-out as floating button
      return (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
        }}>
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
          background: '#1a1a1a',
          color: '#fff',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setScreen({ name: 'dashboard' })}
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
            onSelectOrder={orderId => setScreen({ name: 'delivery', orderId })}
            onGoHistory={() => setScreen({ name: 'history' })}
          />
        )

      case 'delivery':
        return (
          <DeliveryScreen
            orderId={screen.orderId}
            onBack={() => setScreen({ name: 'dashboard' })}
            onComplete={orderId => setScreen({ name: 'proof', orderId })}
          />
        )

      case 'proof':
        return (
          <ProofOfDeliveryScreen
            orderId={screen.orderId}
            onBack={() => setScreen({ name: 'delivery', orderId: screen.orderId })}
            onConfirmed={() => setScreen({ name: 'earnings', orderId: screen.orderId })}
          />
        )

      case 'earnings': {
        const order = state.orders.find(o => o.id === screen.orderId)
        if (!order) {
          setScreen({ name: 'dashboard' })
          return null
        }
        return (
          <EarningsScreen
            order={order}
            onContinue={() => setScreen({ name: 'dashboard' })}
          />
        )
      }

      case 'history':
        return (
          <HistoryScreen
            onSelectOrder={orderId => setScreen({ name: 'delivery', orderId })}
          />
        )
    }
  }

  // ── Shells that are fullscreen don't need d-shell wrapper ─────────────────
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
