import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

const ADMIN_EMAIL    = 'admin@citysend.ca'
const ADMIN_PASSWORD = 'Admin123!'

interface Props { onLogin: () => void }

export function LoginScreen({ onLogin }: Props) {
  const [view,     setView]     = useState<'login' | 'forgot'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)
  // forgot flow
  const [fpEmail,  setFpEmail]  = useState('')
  const [fpSent,   setFpSent]   = useState(false)
  const [fpLoading,setFpLoading]= useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error || !data.user) throw new Error('Invalid email or password.')

        // Verify the user has admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profile && profile.role !== 'admin') {
          await supabase.auth.signOut()
          throw new Error('This account does not have admin access.')
        }
        // Supabase manages its own session — onAuthStateChange in App.tsx sets
        // authed=true via SIGNED_IN / INITIAL_SESSION events
        onLogin()
      } else {
        // Mock fallback
        await new Promise(r => setTimeout(r, 600))
        if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          sessionStorage.setItem('cs_admin_auth', '1')
          onLogin()
        } else {
          throw new Error('Invalid email or password.')
        }
      }
    } catch (e: any) {
      setErr(e.message ?? 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setFpLoading(true)
    if (isSupabaseConfigured) {
      await supabase.auth.resetPasswordForEmail(fpEmail.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      })
    } else {
      await new Promise(r => setTimeout(r, 900))
    }
    setFpLoading(false)
    setFpSent(true)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid var(--a-border)',
    borderRadius: 8, fontSize: 14,
    fontFamily: 'var(--a-font)', outline: 'none',
    background: '#fff', color: 'var(--a-ink)',
    boxSizing: 'border-box',
  }

  const card: React.CSSProperties = {
    width: 380, background: 'var(--a-surface)',
    borderRadius: 16, padding: '40px 36px',
    boxShadow: 'var(--a-shadow-lg)',
    border: '1px solid var(--a-border)',
  }

  const logoBlock = (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
        background: 'var(--a-sidebar)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--a-accent)', letterSpacing: -0.5 }}>CS</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--a-ink)', letterSpacing: -0.4 }}>
        CitySend Admin
      </div>
      <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 4 }}>
        Operations console
      </div>
    </div>
  )

  // ── Forgot password view ──────────────────────────────────────────────────────

  if (view === 'forgot') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg)' }}>
        <div style={card}>
          {logoBlock}
          {fpSent ? (
            <div>
              <div style={{
                padding: '16px', borderRadius: 8, marginBottom: 20,
                background: 'var(--a-ok-bg)', color: 'var(--a-ok)', fontSize: 14, textAlign: 'center',
              }}>
                ✓ Reset instructions sent to <strong>{fpEmail}</strong>.<br />
                <span style={{ fontSize: 12, opacity: 0.8 }}>Check your inbox (this is a demo — no real email sent).</span>
              </div>
              <button
                onClick={() => { setView('login'); setFpSent(false); setFpEmail('') }}
                style={{
                  width: '100%', padding: '11px 0', border: 'none', borderRadius: 8,
                  background: 'var(--a-sidebar)', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleForgot}>
              <div style={{ fontSize: 14, color: 'var(--a-muted)', marginBottom: 20 }}>
                Enter your admin email and we'll send password reset instructions.
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                  placeholder="admin@citysend.ca"
                  style={inputStyle} required
                />
              </div>
              <button
                type="submit"
                disabled={fpLoading}
                style={{
                  width: '100%', padding: '11px 0', border: 'none', borderRadius: 8,
                  background: fpLoading ? 'var(--a-border)' : 'var(--a-sidebar)',
                  color: fpLoading ? 'var(--a-muted)' : '#fff',
                  fontSize: 14, fontWeight: 600, cursor: fpLoading ? 'default' : 'pointer',
                  marginBottom: 12,
                }}
              >{fpLoading ? 'Sending…' : 'Send reset instructions'}</button>
              <button
                type="button"
                onClick={() => setView('login')}
                style={{
                  width: '100%', padding: '9px 0', border: '1.5px solid var(--a-border)',
                  borderRadius: 8, background: 'transparent', color: 'var(--a-ink2)',
                  fontSize: 14, cursor: 'pointer',
                }}
              >← Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Login view ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg)' }}>
      <div style={card}>
        {logoBlock}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@citysend.ca"
              autoComplete="email"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
              required
            />
          </div>

          {/* Forgot password link */}
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => { setView('forgot'); setErr('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--a-accent)', fontSize: 12, padding: 0,
              }}
            >Forgot password?</button>
          </div>

          {err && (
            <div style={{
              padding: '9px 12px', borderRadius: 7, marginBottom: 14,
              background: 'var(--a-err-bg)', color: 'var(--a-err)',
              fontSize: 13,
            }}>{err}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px 0', border: 'none', borderRadius: 8,
              background: loading ? 'var(--a-border)' : 'var(--a-sidebar)',
              color: loading ? 'var(--a-muted)' : '#fff',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{
          marginTop: 20, padding: '10px 12px', borderRadius: 8,
          background: 'var(--a-info-bg)', fontSize: 12, color: 'var(--a-info)',
        }}>
          <strong>Demo credentials</strong><br />
          Email: admin@citysend.ca<br />
          Password: Admin123!
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--a-muted)' }}>
          Customer app · port 5173 &nbsp;|&nbsp; Driver app · port 5175
        </div>
      </div>
    </div>
  )
}
