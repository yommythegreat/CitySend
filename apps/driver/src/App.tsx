import React, { useState } from 'react'
import { DriverProvider, useDriver, signOutDriver } from './store/DriverContext'
import { LoginScreen }            from './screens/LoginScreen'
import { DashboardScreen }        from './screens/DashboardScreen'
import { DeliveryScreen }         from './screens/DeliveryScreen'
import { ProofOfDeliveryScreen }  from './screens/ProofOfDeliveryScreen'
import { HistoryScreen }          from './screens/HistoryScreen'

// ── Screen types ──────────────────────────────────────────────────────────────

type Screen =
  | { name: 'dashboard' }
  | { name: 'delivery';  orderId: string }
  | { name: 'proof';     orderId: string }
  | { name: 'history' }

// ── Inner app (needs DriverProvider) ─────────────────────────────────────────

function DriverApp() {
  const { state, dispatch } = useDriver()
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' })

  if (!state.auth) return <LoginScreen />

  const handleLogout = async () => {
    // Dispatch LOGOUT immediately for instant UI feedback (shows LoginScreen)
    dispatch({ type: 'LOGOUT' })
    setScreen({ name: 'dashboard' })
    // Then call Supabase signOut so the server-side session is invalidated
    // and onAuthStateChange SIGNED_OUT fires (handled in DriverProvider)
    await signOutDriver()
  }

  // ── Topbar ──────────────────────────────────────────────────────────────────

  const renderTopBar = () => {
    if (screen.name === 'dashboard') {
      return (
        <div className="d-topbar">
          <div className="d-topbar-title">🚗 CitySend Driver</div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px', border: '1px solid var(--d-border)',
              borderRadius: 8, background: 'transparent',
              color: 'var(--d-muted)', fontSize: 13, cursor: 'pointer',
            }}
          >Sign out</button>
        </div>
      )
    }

    if (screen.name === 'delivery') {
      const order = state.orders.find(o => o.id === screen.orderId)
      return (
        <div className="d-topbar">
          <button className="d-topbar-back" onClick={() => setScreen({ name: 'dashboard' })}>‹</button>
          <div className="d-topbar-title">{order?.id ?? 'Delivery'}</div>
          <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{order?.distanceKm} km</div>
        </div>
      )
    }

    if (screen.name === 'proof') {
      return (
        <div className="d-topbar">
          <button className="d-topbar-back" onClick={() => setScreen({ name: 'delivery', orderId: (screen as { name: 'proof'; orderId: string }).orderId })}>‹</button>
          <div className="d-topbar-title">Proof of Delivery</div>
        </div>
      )
    }

    if (screen.name === 'history') {
      return (
        <div className="d-topbar">
          <button className="d-topbar-back" onClick={() => setScreen({ name: 'dashboard' })}>‹</button>
          <div className="d-topbar-title">Delivery History</div>
        </div>
      )
    }

    return null
  }

  // ── Screen renderer ─────────────────────────────────────────────────────────

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
            onConfirmed={() => {
              // Show delivery screen in "done" state briefly, then go home
              setScreen({ name: 'delivery', orderId: screen.orderId })
            }}
          />
        )

      case 'history':
        return (
          <HistoryScreen
            onSelectOrder={orderId => setScreen({ name: 'delivery', orderId })}
          />
        )
    }
  }

  return (
    <div className="d-shell">
      {renderTopBar()}
      {renderScreen()}
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
