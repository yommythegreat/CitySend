import React from 'react'
import { IconButton } from '../components/IconButton'
import { Back, User, Phone, Home as HomeIcon, Package, Pin, Repeat, Settings, Bell, Card, Receipt } from '../components/Icons'
import type { AppState, AuthUser, ScreenName } from '../types'

interface Props {
  go:       (screen: ScreenName, opts?: any) => void
  user:     AuthUser
  state:    AppState
  onLogout: () => void | Promise<void>
}

// ── Guest profile ─────────────────────────────────────────────────────────────

function GuestProfile({ go, onLogout }: { go: Props['go']; onLogout: Props['onLogout'] }) {
  const benefits: { label: string; icon: React.ReactNode }[] = [
    { label: 'Save places for faster checkout',  icon: <Pin     size={16} color="var(--cs-accent)" /> },
    { label: 'View delivery history & receipts', icon: <Receipt size={16} color="var(--cs-accent)" /> },
    { label: 'Get real-time notifications',      icon: <Bell    size={16} color="var(--cs-accent)" /> },
    { label: 'Manage payment methods',           icon: <Card    size={16} color="var(--cs-accent)" /> },
  ]

  return (
    <div className="cs-screen cs-enter-right">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Profile</div>
        <IconButton onClick={() => go('settings')}><Settings size={18} /></IconButton>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 28px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Illustration */}
        <div style={{ marginTop: 48, marginBottom: 24 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 44,
            background: 'linear-gradient(135deg, var(--cs-slate-100), var(--cs-slate-150, #e8ebf0))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <User size={36} color="var(--cs-slate-400)" />
            {/* Guest badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: 13,
              background: 'var(--cs-paper)', border: '2px solid var(--cs-slate-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>
              👤
            </div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cs-ink)', letterSpacing: -0.5, textAlign: 'center', marginBottom: 6 }}>
          You're browsing as a guest
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', textAlign: 'center', lineHeight: 1.5, marginBottom: 28 }}>
          Create a profile to unlock the full CitySend experience.
        </div>

        {/* Benefits */}
        <div style={{
          width: '100%', background: '#fff',
          borderRadius: 16, border: '1px solid var(--cs-slate-100)',
          padding: '4px 0', marginBottom: 24,
        }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'rgba(201,74,27,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {b.icon}
              </div>
              <div style={{ fontSize: 14, color: 'var(--cs-ink)', fontWeight: 500 }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button
          onClick={() => go('auth')}
          style={{
            width: '100%', padding: '15px 0', border: 'none', borderRadius: 14,
            background: 'var(--cs-ink)', color: '#fff',
            fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginBottom: 10,
          }}
        >
          Create a profile
        </button>
        <button
          onClick={() => go('auth')}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            border: '1.5px solid var(--cs-slate-200)', background: '#fff',
            color: 'var(--cs-ink)', fontFamily: 'var(--cs-font)',
            fontSize: 15, fontWeight: 500, cursor: 'pointer', marginBottom: 8,
          }}
        >
          Sign in
        </button>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── Registered profile ────────────────────────────────────────────────────────

export function ProfileScreen({ go, user, state, onLogout }: Props) {
  if (user.id === 'guest') {
    return <GuestProfile go={go} onLogout={onLogout} />
  }

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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Saved places
            </div>
            <button
              onClick={() => go('add-place')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-accent)', fontWeight: 500, fontSize: 13, fontFamily: 'var(--cs-font)', padding: 0 }}
            >
              + Add
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
            {state.savedAddresses.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', lineHeight: 1.5 }}>
                  No saved places yet. Tap <strong>+ Add</strong> to save a frequent address.
                </div>
              </div>
            ) : (
              state.savedAddresses.map((a, i) => (
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
              ))
            )}
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

        {/* Logout */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 8 }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--cs-font)', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--cs-err)' }}>Log out</div>
          </button>
        </div>

        <div style={{ height: 28 }} />
      </div>
    </div>
  )
}
