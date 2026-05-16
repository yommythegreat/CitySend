import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import { useDriver } from '../store/DriverContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'account' | 'profile' | 'success'

interface AccountFields {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface ProfileFields {
  phone: string
  vehicle: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)
}

async function registerDriver(
  account: AccountFields,
  profile: ProfileFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase is not configured. Connect a project to enable sign-up.' }
  }

  // 1. Create auth user
  const { data, error: authErr } = await supabase.auth.signUp({
    email: account.email.trim().toLowerCase(),
    password: account.password,
  })

  if (authErr) return { ok: false, error: authErr.message }
  if (!data.user) return { ok: false, error: 'Account creation failed. Please try again.' }

  // 2. Insert driver row linked to the new auth user
  const driverId = 'drv_' + data.user.id.slice(0, 8)  // short deterministic ID
  const { error: dbErr } = await supabase.from('drivers').insert({
    id:               driverId,
    user_id:          data.user.id,
    name:             account.name.trim(),
    initials:         initials(account.name),
    email:            account.email.trim().toLowerCase(),
    phone:            profile.phone.trim(),
    vehicle:          profile.vehicle.trim(),
    status:           'offline',          // admin activates the driver
    rating:           5.0,
    completed_orders: 0,
  })

  if (dbErr) {
    // Auth user was created but driver row failed — sign out to keep things clean
    await supabase.auth.signOut()
    return { ok: false, error: dbErr.message }
  }

  // 3. Sign out so the driver goes through the normal login flow
  //    (admin may need to approve first — they'll see status: offline on login)
  await supabase.auth.signOut()
  return { ok: true }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onBackToLogin: () => void
}

export function DriverSignupScreen({ onBackToLogin }: Props) {
  useDriver()  // ensure context available (for future auth redirect)

  const [step, setStep] = useState<Step>('account')

  const [account, setAccount] = useState<AccountFields>({
    name: '', email: '', password: '', confirmPassword: '',
  })
  const [profile, setProfile] = useState<ProfileFields>({
    phone: '', vehicle: '',
  })

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPw,   setShowPw]   = useState(false)

  // ── Step 1: Account info ─────────────────────────────────────────────────

  const handleAccountNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (account.password.length < 8)
      return setError('Password must be at least 8 characters.')
    if (account.password !== account.confirmPassword)
      return setError('Passwords do not match.')

    setStep('profile')
  }

  // ── Step 2: Profile info + submit ────────────────────────────────────────

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await registerDriver(account, profile)
      if (result.ok) {
        setStep('success')
      } else {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Shared wrapper ───────────────────────────────────────────────────────

  const wrap = (body: React.ReactNode) => (
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
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--d-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px',
          boxShadow: '0 4px 16px rgba(201,74,27,.35)',
        }}>🚗</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--d-ink)', letterSpacing: -0.5 }}>
          Join CitySend
        </div>
        <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 4 }}>
          Create your driver account
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        {body}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Step indicators ──────────────────────────────────────────────────────

  const StepDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {(['account', 'profile'] as Step[]).map((s, i) => (
        <div key={s} style={{
          width: s === step ? 20 : 8,
          height: 8,
          borderRadius: 4,
          background: s === step ? 'var(--d-accent)' : 'var(--d-border)',
          transition: 'all .2s ease',
        }} />
      ))}
    </div>
  )

  // ── Success view ─────────────────────────────────────────────────────────

  if (step === 'success') {
    return wrap(
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(22,107,58,.15)', border: '2px solid #166b3a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 32,
        }}>✓</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 8 }}>
          Application received!
        </div>
        <div style={{ fontSize: 14, color: 'var(--d-muted)', lineHeight: 1.5, marginBottom: 28 }}>
          Your account has been created. A CitySend administrator will activate your driver profile before you can sign in.
          <br /><br />
          Once activated, sign in with your email and password.
        </div>
        <button
          className="d-btn d-btn-primary"
          onClick={onBackToLogin}
        >
          Go to sign in
        </button>
      </div>
    )
  }

  // ── Step 1: Account ──────────────────────────────────────────────────────

  if (step === 'account') {
    return wrap(
      <>
        <StepDots />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 18 }}>
          Step 1 of 2 — Account details
        </div>

        <form onSubmit={handleAccountNext}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
              Full name
            </label>
            <input
              className="d-input"
              type="text"
              value={account.name}
              onChange={e => setAccount(a => ({ ...a, name: e.target.value }))}
              placeholder="Alex Fontaine"
              autoComplete="name"
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
              Email address
            </label>
            <input
              className="d-input"
              type="email"
              value={account.email}
              onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="d-input"
                type={showPw ? 'text' : 'password'}
                value={account.password}
                onChange={e => setAccount(a => ({ ...a, password: e.target.value }))}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
              Confirm password
            </label>
            <input
              className="d-input"
              type={showPw ? 'text' : 'password'}
              value={account.confirmPassword}
              onChange={e => setAccount(a => ({ ...a, confirmPassword: e.target.value }))}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--d-err-bg)', border: '1px solid var(--d-err-border)',
              borderRadius: 8, fontSize: 13, color: 'var(--d-err)', marginBottom: 16,
            }}>{error}</div>
          )}

          <button type="submit" className="d-btn d-btn-primary" style={{ marginBottom: 12 }}>
            Next →
          </button>
          <button type="button" className="d-btn d-btn-outline" onClick={onBackToLogin}>
            ← Back to sign in
          </button>
        </form>
      </>
    )
  }

  // ── Step 2: Profile ──────────────────────────────────────────────────────

  return wrap(
    <>
      <StepDots />
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 18 }}>
        Step 2 of 2 — Driver details
      </div>

      <form onSubmit={handleProfileSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
            Phone number
          </label>
          <input
            className="d-input"
            type="tel"
            value={profile.phone}
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            placeholder="204 555 0000"
            autoComplete="tel"
            required
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--d-ink-2)', marginBottom: 6 }}>
            Vehicle
          </label>
          <select
            className="d-input"
            value={profile.vehicle}
            onChange={e => setProfile(p => ({ ...p, vehicle: e.target.value }))}
            required
            style={{ appearance: 'none', backgroundImage: 'none' }}
          >
            <option value="" disabled>Select your vehicle type</option>
            <option value="Cargo Bike">Cargo Bike</option>
            <option value="Scooter">Scooter</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Car">Car</option>
            <option value="Cargo Van">Cargo Van</option>
            <option value="Box Truck">Box Truck</option>
          </select>
        </div>

        {/* Terms notice */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(201,74,27,.06)', border: '1px solid rgba(201,74,27,.2)',
          borderRadius: 10, fontSize: 12, color: 'var(--d-muted)', marginBottom: 18, lineHeight: 1.5,
        }}>
          By signing up you agree to CitySend's Driver Terms of Service. Your account will be reviewed by an administrator before activation.
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--d-err-bg)', border: '1px solid var(--d-err-border)',
            borderRadius: 8, fontSize: 13, color: 'var(--d-err)', marginBottom: 16,
          }}>{error}</div>
        )}

        <button
          type="submit"
          className="d-btn d-btn-primary"
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, marginBottom: 12 }}
        >
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Creating account…
              </span>
            : 'Create account'}
        </button>
        <button
          type="button"
          className="d-btn d-btn-outline"
          onClick={() => { setStep('account'); setError('') }}
          disabled={loading}
        >
          ← Back
        </button>
      </form>
    </>
  )
}
