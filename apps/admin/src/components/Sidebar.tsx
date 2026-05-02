import React from 'react'
import type { AdminScreen } from '../App'

interface Props {
  screen:   AdminScreen
  go:       (s: AdminScreen) => void
  onLogout: () => void
  orderCounts:   { new: number; active: number }
  openIncidents: number
}

const NAV: { id: AdminScreen; label: string; icon: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: '▦'  },
  { id: 'orders',        label: 'Orders',        icon: '📦' },
  { id: 'drivers',       label: 'Drivers',       icon: '🚗' },
  { id: 'customers',     label: 'Customers',     icon: '👤' },
  { id: 'billing',       label: 'Billing',       icon: '💳' },
  { id: 'incidents',     label: 'Incidents',     icon: '🚨' },
  { id: 'analytics',     label: 'Analytics',     icon: '📊' },
  { id: 'configuration', label: 'Configuration', icon: '⚙️' },
]

export function Sidebar({ screen, go, onLogout, orderCounts, openIncidents }: Props) {
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--a-sidebar)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--a-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff',
          }}>CS</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, letterSpacing: -0.3 }}>CitySend</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 0.5 }}>ADMIN CONSOLE</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = screen === item.id
          const badge =
            item.id === 'orders'    && orderCounts.new   > 0 ? orderCounts.new   :
            item.id === 'incidents' && openIncidents      > 0 ? openIncidents     : 0
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 7, marginBottom: 2,
                border: 'none', textAlign: 'left',
                background: active ? 'var(--a-sidebar-act)' : 'transparent',
                color: active ? 'var(--a-sidebar-hi)' : 'var(--a-sidebar-txt)',
                fontSize: 14, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--a-sidebar-item)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge > 0 && (
                <span style={{
                  background: item.id === 'incidents' ? '#f59e0b' : 'var(--a-accent)',
                  color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 999, minWidth: 18, textAlign: 'center',
                }}>{badge}</span>
              )}
              {item.id === 'drivers' && orderCounts.active > 0 && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--a-ok)', flexShrink: 0,
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ padding: '8px 12px', marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: 'var(--a-sidebar-txt)' }}>Signed in as</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-sidebar-hi)', marginTop: 1 }}>admin@citysend.ca</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '8px 12px', border: 'none',
            borderRadius: 7, background: 'transparent', textAlign: 'left',
            color: 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          ↩ Sign out
        </button>
      </div>
    </aside>
  )
}
