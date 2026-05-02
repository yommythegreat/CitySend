import React, { useState } from 'react'
import { useDriver, authenticateDriver } from '../store/DriverContext'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

export function LoginScreen() {
  const { dispatch } = useDriver()
  const [view,     setView]     = useState<'login' | 'forgot'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)
  // forgot flow
  const [fpEmail,  setFpEmail]  = useState('')
  const [fpLoading,setFpLoading]= useState(false)
  const [fpSent,   setFpSent]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const auth = await authenticateDriver(email, password)
      if (auth) {
        dispatch({ type: 'LOGIN', auth })
      } else {
        setError('Incorrect email or password.')
      }
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed. Please try again.')
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

  // ── Forgot password view ────────────────────────────────────────────────────

  if (view === 'forgot') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--d-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(201,74,27,.35)' }}>🔑</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--d-ink)', letterSpacing: -0.5 }}>Reset password</div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 4 }}>We'll send instructions to your email</div>
        </div>

        <div style={{ width: '100%', maxWidth: 360 }}>
          {fpSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ padding: '16px', background: 'var(--d-ok-bg)', border: '1px solid var(--d-ok-border)', borderRadius: 12, fontSize: 14, color: '#166534', marginBottom: 20 }}>
                ✓ Reset link sent to <strong>{fpEmail}</strong>.<br />
                <span style={{ fontSize: 12, opacity: 0.8 }}>Check your inbox (demo — no real email sent).</span>
              </div>
              <button
                className="d-btn d-btn-primary"
                onClick={() => { setView('login'); setFpSent(false); setFpEmail('') }}
              >Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleForgot}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  className="d-input"
                  type="email"
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  placeholder="you@citysend.ca"
                  required
                />
              </div>
              <button
                type="submit"
                className="d-btn d-btn-primary"
                disabled={fpLoading}
                style={{ opacity: fpLoading ? 0.7 : 1, marginBottom: 12 }}
              >{fpLoading ? 'Sending…' : 'Send reset link'}</button>
              <button
                type="button"
                className="d-btn d-btn-outline"
                onClick={() => setView('login')}
              >← Back to sign in</button>
            </form>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Login view ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--d-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--d-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px',
          boxShadow: '0 4px 16px rgba(201,74,27,.35)',
        }}>🚗</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--d-ink)', letterSpacing: -0.5 }}>CitySend Driver</div>
        <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 4 }}>Sign in to your driver account</div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
            Email address
          </label>
          <input
            className="d-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@citysend.ca"
            autoComplete="email"
            required
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="d-input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{ paddingRight: 48 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--d-muted)', fontSize: 16,
              }}
            >{showPw ? '🙈' : '👁️'}</button>
          </div>
        </div>

        {/* Forgot password */}
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { setView('forgot'); setError('') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--d-accent)', fontSize: 13, padding: 0, fontFamily: 'var(--d-font)',
            }}
          >Forgot password?</button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: 'var(--d-err-bg)', border: '1px solid var(--d-err-border)',
            borderRadius: 8, fontSize: 13, color: 'var(--d-err)', marginBottom: 16,
          }}>{error}</div>
        )}

        <button
          type="submit"
          className="d-btn d-btn-primary"
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Signing in…
              </span>
            : 'Sign In'}
        </button>
      </form>

      {/* Demo credentials hint */}
      <div style={{
        marginTop: 32, padding: '12px 16px',
        background: 'var(--d-surface)', borderRadius: 10,
        border: '1px solid var(--d-border)',
        fontSize: 12, color: 'var(--d-muted)',
        maxWidth: 360, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 4 }}>Demo credentials</div>
        <div>driver@citysend.ca</div>
        <div>Driver123!</div>
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
          Any existing driver email also works with Driver123!
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
