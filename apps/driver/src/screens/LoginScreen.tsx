import React, { useState } from 'react'
import { useDriver, authenticateDriver } from '../store/DriverContext'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

// ── Design tokens (matches customer app) ─────────────────────────────────────
const T = {
  ink:       '#0b1220',
  accent:    '#c94a1b',
  paper:     '#fafbfc',
  slate50:   '#f5f6f8',
  slate100:  '#eceef2',
  slate200:  '#d8dde5',
  slate400:  '#8590a6',
  slate500:  '#5b657a',
  err:       '#b3261e',
  font:      "'Geist', -apple-system, system-ui, sans-serif",
  mono:      "'Geist Mono', ui-monospace, Menlo, monospace",
}

// ── Logo (matches customer app wordmark) ─────────────────────────────────────
function LogoWordmark({ scale = 1 }: { scale?: number }) {
  return (
    <svg viewBox="0 0 182 52" width={182 * scale} height={52 * scale} style={{ display: 'block' }}>
      <text x="0"  y="38" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={T.ink} letterSpacing="-1.4">city</text>
      <text x="89" y="38" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={T.ink} letterSpacing="-1.4">send</text>
      <g transform="translate(77.5, 26)">
        <path d="M0 0 L9 0 M6 -3 L9 0 L6 3" stroke={T.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    </svg>
  )
}

// ── Field (matches customer app Field component) ──────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', error, autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const isPassword = type === 'password'
  const actualType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontFamily: T.mono, color: T.slate500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 52, padding: '0 14px 0 16px',
        background: '#fff',
        border: `1.5px solid ${error ? T.err : focused ? T.ink : T.slate200}`,
        borderRadius: 12, transition: 'border-color .15s',
      }}>
        <input
          type={actualType}
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: T.font, fontSize: 16, color: T.ink, minWidth: 0,
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slate400, display: 'flex', padding: '0 2px', flexShrink: 0 }}>
            {showPw
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: T.err, marginTop: 4, paddingLeft: 2 }}>{error}</div>}
    </label>
  )
}

// ── Pill button (matches customer app Button component) ───────────────────────
function PillButton({
  children, onClick, disabled, loading, kind = 'ink', full,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  kind?: 'ink' | 'ghost'
  full?: boolean
}) {
  const [press, setPress] = useState(false)
  const bg    = kind === 'ink' ? T.ink : 'transparent'
  const color = kind === 'ink' ? '#fff' : T.slate500
  const shadow = kind === 'ink' ? '0 6px 16px -6px rgba(11,18,32,.4)' : 'none'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      style={{
        height: 56, padding: '0 22px', fontSize: 17, fontWeight: 500,
        width: full ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: T.font, letterSpacing: -0.2,
        borderRadius: 999, cursor: (disabled || loading) ? 'default' : 'pointer',
        background: (disabled || loading) ? '#e8ebf0' : bg,
        color: (disabled || loading) ? T.slate400 : color,
        border: 'none', boxShadow: (disabled || loading) ? 'none' : shadow,
        transform: press && !(disabled || loading) ? 'scale(.97)' : 'scale(1)',
        transition: 'transform .1s',
      }}
    >
      {loading && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'cs-auth-spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
      {children}
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onSignUp?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LoginScreen({ onSignUp }: Props) {
  const { dispatch } = useDriver()
  const [tab,       setTab]       = useState<'login' | 'forgot'>('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passTouched,  setPassTouched]  = useState(false)

  // forgot flow
  const [fpEmail,   setFpEmail]   = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpSent,    setFpSent]    = useState(false)

  const valid = email.trim().length > 4 && password.trim().length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || loading) return
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
        redirectTo: window.location.origin,
      })
    } else {
      await new Promise(r => setTimeout(r, 900))
    }
    setFpLoading(false)
    setFpSent(true)
  }

  // ── Wrapper ───────────────────────────────────────────────────────────────

  const wrap = (body: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: T.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: T.font }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 12 }}>
        <LogoWordmark scale={0.72} />
        <div style={{ padding: '4px 12px', background: T.accent, borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: 1.2, fontFamily: T.mono, textTransform: 'uppercase' }}>
          Driver Portal
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        {body}
      </div>

      {/* Fine print */}
      <div style={{ marginTop: 32, fontSize: 11, color: T.slate400, fontFamily: T.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        SAME-DAY · WINNIPEG · citysend.ca
      </div>

      <style>{`@keyframes cs-auth-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Forgot password ───────────────────────────────────────────────────────

  if (tab === 'forgot') {
    return wrap(
      fpSent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: T.ink }}>Check your inbox</div>
          <div style={{ fontSize: 14, color: T.slate500, marginTop: 8, lineHeight: 1.6, maxWidth: 280, margin: '8px auto 0' }}>
            We sent a reset link to <strong style={{ color: T.ink }}>{fpEmail}</strong>.
          </div>
          <div style={{ marginTop: 24 }}>
            <PillButton full kind="ghost" onClick={() => { setTab('login'); setFpSent(false); setFpEmail('') }}>
              ← Back to sign in
            </PillButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, color: T.ink }}>Reset password</div>
            <div style={{ fontSize: 14, color: T.slate500, marginTop: 6 }}>We'll send instructions to your email.</div>
          </div>
          <Field label="Email address" value={fpEmail} onChange={setFpEmail} placeholder="you@citysend.ca" type="email" autoComplete="email" />
          <PillButton full loading={fpLoading} onClick={() => handleForgot({ preventDefault: () => {} } as React.FormEvent)}>
            {fpLoading ? 'Sending…' : 'Send reset link'}
          </PillButton>
          <PillButton full kind="ghost" onClick={() => setTab('login')}>← Back to sign in</PillButton>
        </form>
      )
    )
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  return wrap(
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: T.ink }}>Welcome back.</div>
        <div style={{ fontSize: 14, color: T.slate500, marginTop: 6, lineHeight: 1.4 }}>Sign in to your driver account.</div>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field
          label="Email" value={email} onChange={v => { setEmail(v); setError('') }}
          placeholder="you@citysend.ca" type="email" autoComplete="email"
          error={emailTouched && email.trim().length <= 4 ? 'Enter a valid email.' : undefined}
        />
        <div onBlur={() => setEmailTouched(true)} />

        <Field
          label="Password" value={password} onChange={v => { setPassword(v); setError('') }}
          placeholder="6+ characters" type="password" autoComplete="current-password"
          error={passTouched && password.trim().length < 6 ? 'Password must be at least 6 characters.' : undefined}
        />
        <div onBlur={() => setPassTouched(true)} />
      </div>

      {/* Forgot */}
      <div style={{ textAlign: 'right', marginTop: 6, marginBottom: 4 }}>
        <button type="button" onClick={() => { setTab('forgot'); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.slate500, fontFamily: T.font, padding: 0 }}>
          Forgot password?
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: T.err, lineHeight: 1.4, marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillButton full loading={loading} disabled={!valid} onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}>
          {loading ? 'Signing in…' : 'Sign in'}
        </PillButton>

        {onSignUp && (
          <button type="button" onClick={onSignUp} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.slate500, fontFamily: T.font, padding: '8px 0', textAlign: 'center' }}>
            New driver? Apply to drive →
          </button>
        )}
      </div>
    </form>
  )
}
