import React, { useState, useEffect } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AdminProvider } from './store/AdminContext'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
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

// Orders stuck in an active status for more than 2 hours
const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000
const ACTIVE_STATUSES    = ['assigned', 'picked_up', 'in_transit']

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState<AdminScreen>('dashboard')
  const { state } = useAdminStore()

  const orderCounts = {
    new:    state.orders.filter(o => o.status === 'new').length,
    active: state.orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
  }
  const openIncidents = state.incidents.filter(i => i.status === 'new' || i.status === 'in_review').length
  const stuckOrders   = state.orders.filter(o =>
    ACTIVE_STATUSES.includes(o.status) &&
    Date.now() - new Date(o.updatedAt).getTime() > STUCK_THRESHOLD_MS
  ).length

  // Inactivity timeout — sign admin out after 60 min with no interaction
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const TIMEOUT_MS = 60 * 60 * 1000
    let timer: ReturnType<typeof setTimeout>

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(onLogout, TIMEOUT_MS)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [onLogout])

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
          {stuckOrders > 0 && (
            <button
              onClick={() => setScreen('orders')}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 999,
                background: '#fff3cd', color: '#856404',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 8,
              }}
            >
              ⚠️ {stuckOrders} stuck deliver{stuckOrders > 1 ? 'ies' : 'y'}
            </button>
          )}
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
  // authChecked: true once we know whether there is a valid session.
  //   Prevents a flash of the login screen on page load when the user is logged in.
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured)
  const [authed,      setAuthed]      = useState(
    // Non-Supabase fallback: persist in sessionStorage (clears on tab close)
    () => !isSupabaseConfigured && sessionStorage.getItem('cs_admin_auth') === '1'
  )

  // ── Supabase auth listener ──────────────────────────────────────────────────
  // Supabase is the single source of truth when configured.
  // INITIAL_SESSION  → verify admin role, setAuthed accordingly
  // SIGNED_OUT       → force logged out regardless of what triggered it
  // Non-Supabase     → rely on sessionStorage flag set by LoginScreen
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[AdminAuth] state change:', event, session?.user?.email ?? 'no user')

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            // Re-verify admin role on every page load — never trust the client alone
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle()

            if (profile?.role === 'admin') {
              setAuthed(true)
            } else {
              // Valid Supabase session but not an admin — sign out silently
              console.warn('[AdminAuth] session user is not admin — signing out')
              await supabase.auth.signOut()
              setAuthed(false)
            }
          } else {
            setAuthed(false)
          }
          setAuthChecked(true)

        } else if (event === 'SIGNED_IN') {
          // Handled by LoginScreen after role-check → calls onLogin()
          // Nothing extra needed here; authChecked may already be true
          setAuthChecked(true)

        } else if (event === 'SIGNED_OUT') {
          console.log('[AdminAuth] SIGNED_OUT — clearing admin session')
          setAuthed(false)
          setAuthChecked(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = () => setAuthed(true)

  const handleLogout = async () => {
    // Clear state immediately so the UI snaps to login at once
    setAuthed(false)

    if (isSupabaseConfigured) {
      // Await so Supabase clears its localStorage tokens before we return.
      // onAuthStateChange SIGNED_OUT also fires but state is already cleared.
      await supabase.auth.signOut()
    } else {
      sessionStorage.removeItem('cs_admin_auth')
    }
  }

  // Render nothing until we know the auth state (avoids login-screen flash)
  if (!authChecked) return null

  if (!authed) return <LoginScreen onLogin={handleLogin} />

  return (
    <AdminProvider>
      <AdminApp onLogout={handleLogout} />
    </AdminProvider>
  )
}
