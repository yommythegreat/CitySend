import React, { useState } from 'react'
import { LogoWordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { User, Lock, Back } from '../components/Icons'
import { IconButton } from '../components/IconButton'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AuthUser, ScreenName } from '../types'

interface Props {
  onAuth: (user: AuthUser, token: string) => void
  go: (screen: ScreenName) => void
}

type Tab = 'login' | 'register'

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
}

export function AuthScreen({ onAuth, go }: Props) {
  const [tab, setTab]         = useState<Tab>('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const valid = tab === 'login'
    ? email.trim().length > 4 && password.trim().length >= 6
    : name.trim().length > 0 && email.trim().length > 4 && password.trim().length >= 6

  const submit = async () => {
    if (!valid || loading) return
    setError(null)
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        if (tab === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(), password,
          })
          if (error || !data.user) throw new Error(error?.message ?? 'Invalid credentials.')

          const authUser: AuthUser = {
            id:    data.user.id,
            email: data.user.email ?? '',
            name:  data.user.user_metadata?.name ?? email.split('@')[0],
          }
          localStorage.setItem('cs_token', data.session?.access_token ?? '')
          localStorage.setItem('cs_user',  JSON.stringify(authUser))
          onAuth(authUser, data.session?.access_token ?? '')
        } else {
          // Register
          const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: { data: { name: name.trim(), role: 'customer' } },
          })
          if (error || !data.user) throw new Error(error?.message ?? 'Registration failed.')

          const authUser: AuthUser = {
            id:    data.user.id,
            email: data.user.email ?? '',
            name:  name.trim(),
          }
          localStorage.setItem('cs_token', data.session?.access_token ?? '')
          localStorage.setItem('cs_user',  JSON.stringify(authUser))
          onAuth(authUser, data.session?.access_token ?? '')
        }
      } else {
        // ── Fallback: use Express server (original behaviour) ──────────────
        const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
        const body     = tab === 'login'
          ? { email: email.trim(), password }
          : { email: email.trim(), name: name.trim(), password }

        const res  = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

        localStorage.setItem('cs_token', data.token)
        localStorage.setItem('cs_user',  JSON.stringify(data.user))
        onAuth(data.user as AuthUser, data.token)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const continueAsGuest = () => {
    const guest: AuthUser = { id: 'guest', email: '', name: 'Guest' }
    onAuth(guest, '')
  }

  return (
    <div className="cs-screen cs-screen--paper" style={{ justifyContent: 'center' }}>
      <div style={{ padding: '0 28px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <LogoWordmark scale={0.7} />
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: 'var(--cs-ink)' }}>
            {tab === 'login' ? 'Welcome back.' : 'Create your account.'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 6, lineHeight: 1.4 }}>
            {tab === 'login' ? 'Sign in to track and repeat your deliveries.' : 'Takes 10 seconds. No credit card required yet.'}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', padding: 4, background: 'var(--cs-slate-100)', borderRadius: 12, gap: 2, marginBottom: 24 }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null) }}
              style={{
                flex: 1, border: 'none', cursor: 'pointer', height: 36,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? 'var(--cs-ink)' : 'var(--cs-slate-500)',
                fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
                borderRadius: 9, boxShadow: tab === t ? '0 1px 2px rgba(11,18,32,.08)' : 'none',
                transition: 'all .15s', textTransform: 'capitalize',
              }}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && (
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Sasha Novak"
              icon={<User size={18} />}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPass}
            placeholder="6+ characters"
            type="password"
            icon={<Lock size={18} />}
          />
          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <button
                onClick={() => go('forgot-password')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: 'var(--cs-err)', lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            kind="ink" size="lg" full
            onClick={submit}
            disabled={!valid || loading}
            icon={loading ? <Spinner /> : undefined}
          >
            {loading ? (tab === 'login' ? 'Signing in…' : 'Creating account…') : (tab === 'login' ? 'Sign in' : 'Create account')}
          </Button>

          <button
            onClick={continueAsGuest}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)',
              padding: '8px 0', textAlign: 'center',
            }}
          >
            Continue as guest →
          </button>
        </div>

        {/* Fine print */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', lineHeight: 1.6 }}>
          SAME-DAY · WINNIPEG · citysend.ca
        </div>
      </div>
    </div>
  )
}
