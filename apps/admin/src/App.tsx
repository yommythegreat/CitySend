import React, { useState } from 'react'
import { AdminProvider } from './store/AdminContext'
import { Sidebar }              from './components/Sidebar'
import { LoginScreen }          from './screens/LoginScreen'
import { DashboardScreen }      from './screens/DashboardScreen'
import { OrdersScreen }         from './screens/OrdersScreen'
import { DriversScreen }        from './screens/DriversScreen'
import { CustomersScreen }      from './screens/CustomersScreen'
import { BillingScreen }        from './screens/BillingScreen'
import { ConfigurationScreen }  from './screens/ConfigurationScreen'
import { IncidentsScreen }      from './screens/IncidentsScreen'
import { AnalyticsScreen }      from './screens/AnalyticsScreen'
import { useAdminStore }        from './store/AdminContext'

export type AdminScreen =
  | 'dashboard'
  | 'orders'
  | 'drivers'
  | 'customers'
  | 'billing'
  | 'incidents'
  | 'analytics'
  | 'configuration'

// ── Inner app (needs AdminContext) ────────────────────────────────────────────

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState<AdminScreen>('dashboard')
  const { state } = useAdminStore()

  const orderCounts = {
    new:    state.orders.filter(o => o.status === 'new').length,
    active: state.orders.filter(o => ['assigned','picked_up','in_transit'].includes(o.status)).length,
  }
  const openIncidents = state.incidents.filter(i => i.status === 'new' || i.status === 'in_review').length

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':     return <DashboardScreen go={setScreen} />
      case 'orders':        return <OrdersScreen />
      case 'drivers':       return <DriversScreen />
      case 'customers':     return <CustomersScreen />
      case 'billing':       return <BillingScreen />
      case 'incidents':     return <IncidentsScreen />
      case 'analytics':     return <AnalyticsScreen />
      case 'configuration': return <ConfigurationScreen />
    }
  }

  return (
    <div className="admin-shell">
      <Sidebar
        screen={screen}
        go={setScreen}
        onLogout={onLogout}
        orderCounts={orderCounts}
        openIncidents={openIncidents}
      />
      <div className="admin-main">
        {/* Top bar */}
        <div style={{
          padding: '0 24px', height: 52, display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--a-border)', background: 'var(--a-surface)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: 'var(--a-muted)' }}>
            CitySend Admin Console
          </span>
          <div style={{ flex: 1 }} />
          {orderCounts.new > 0 && (
            <button
              onClick={() => setScreen('orders')}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 999,
                background: 'var(--a-err-bg)', color: 'var(--a-err)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 8,
              }}
            >
              {orderCounts.new} new order{orderCounts.new > 1 ? 's' : ''} waiting
            </button>
          )}
          {openIncidents > 0 && (
            <button
              onClick={() => setScreen('incidents')}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 999,
                background: '#fff3cd', color: '#856404',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {openIncidents} open incident{openIncidents > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Screen content */}
        <div className="admin-content">
          {renderScreen()}
        </div>
      </div>
    </div>
  )
}

// ── Root app (auth gate) ──────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('cs_admin_auth') === '1'
  )

  const handleLogin  = () => setAuthed(true)
  const handleLogout = () => {
    sessionStorage.removeItem('cs_admin_auth')
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onLogin={handleLogin} />

  return (
    <AdminProvider>
      <AdminApp onLogout={handleLogout} />
    </AdminProvider>
  )
}
