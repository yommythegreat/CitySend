import React from 'react'
import { IconButton } from '../components/IconButton'
import { Back, User, Phone, Home as HomeIcon, Package, Pin, Repeat, Settings } from '../components/Icons'
import type { AppState, AuthUser, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  user: AuthUser
  state: AppState
}

export function ProfileScreen({ go, user, state }: Props) {
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="cs-screen cs-enter-right">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Profile</div>
        <IconButton onClick={() => go('settings')}><Settings size={18} /></IconButton>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 28px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40,
            background: 'linear-gradient(135deg,#2b3548,#5b657a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 600, color: '#fff', marginBottom: 14,
          }}>
            {initials}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.5 }}>{user.name}</div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 4 }}>{user.email}</div>
        </div>

        {/* Contact info */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Contact
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Name</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 1 }}>{user.name}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--cs-slate-100)', margin: '0 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>@</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 1 }}>{user.email}</div>
              </div>
            </div>
            {user.phone && (
              <>
                <div style={{ height: 1, background: 'var(--cs-slate-100)', margin: '0 16px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Phone</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 1 }}>{user.phone}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Saved addresses */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Saved places
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
            {state.savedAddresses.map((a, i) => (
              <div key={i}>
                {i > 0 && <div style={{ height: 1, background: 'var(--cs-slate-100)', margin: '0 16px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {a.icon === 'home' ? <HomeIcon size={16} /> : a.icon === 'package' ? <Package size={16} /> : <Pin size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{a.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>{a.address}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent deliveries */}
        {state.pastDeliveries.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Recent deliveries
              </div>
              <button onClick={() => go('history')} style={{ fontSize: 13, color: 'var(--cs-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--cs-font)' }}>
                View all
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
              {state.pastDeliveries.slice(0, 3).map((d, i) => (
                <div key={d.id}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--cs-slate-100)', margin: '0 16px' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Repeat size={14} color="var(--cs-accent)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{d.to.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>{d.to.address.split(',')[0]} · {d.date}</div>
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>${d.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
