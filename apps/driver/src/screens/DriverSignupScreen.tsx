import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

// ── Design tokens (matches customer app) ─────────────────────────────────────
const T = {
  ink:      '#0b1220',
  accent:   '#c94a1b',
  paper:    '#fafbfc',
  slate100: '#eceef2',
  slate200: '#d8dde5',
  slate400: '#8590a6',
  slate500: '#5b657a',
  err:      '#b3261e',
  font:     "'Geist', -apple-system, system-ui, sans-serif",
  mono:     "'Geist Mono', ui-monospace, Menlo, monospace",
}

// ── Logo ──────────────────────────────────────────────────────────────────────
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

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', error, autoComplete, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  autoComplete?: string
  required?: boolean
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
          required={required}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: T.font, fontSize: 16, color: T.ink, minWidth: 0 }}
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

// ── Select field ──────────────────────────────────────────────────────────────
function SelectField({
  label, value, onChange, options, placeholder, error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontFamily: T.mono, color: T.slate500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        height: 52, padding: '0 14px 0 16px', background: '#fff',
        border: `1.5px solid ${error ? T.err : focused ? T.ink : T.slate200}`,
        borderRadius: 12, transition: 'border-color .15s', position: 'relative',
        display: 'flex', alignItems: 'center',
      }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: T.font, fontSize: 16, color: value ? T.ink : T.slate400,
            appearance: 'none', minWidth: 0, cursor: 'pointer',
          }}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.slate400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, pointerEvents: 'none' }}>
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </div>
      {error && <div style={{ fontSize: 12, color: T.err, marginTop: 4, paddingLeft: 2 }}>{error}</div>}
    </label>
  )
}

// ── Pill button ───────────────────────────────────────────────────────────────
function PillButton({
  children, onClick, disabled, loading, kind = 'ink', full, type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  kind?: 'ink' | 'ghost'
  full?: boolean
  type?: 'button' | 'submit'
}) {
  const [press, setPress] = useState(false)
  const inactive = disabled || loading
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={inactive}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      style={{
        height: 56, padding: '0 22px', fontSize: 17, fontWeight: 500,
        width: full ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: T.font, letterSpacing: -0.2,
        borderRadius: 999, cursor: inactive ? 'default' : 'pointer',
        background: inactive ? '#e8ebf0' : kind === 'ink' ? T.ink : 'transparent',
        color: inactive ? T.slate400 : kind === 'ink' ? '#fff' : T.slate500,
        border: 'none',
        boxShadow: inactive || kind === 'ghost' ? 'none' : '0 6px 16px -6px rgba(11,18,32,.4)',
        transform: press && !inactive ? 'scale(.97)' : 'scale(1)',
        transition: 'transform .1s',
        opacity: inactive ? 0.7 : 1,
      }}
    >
      {loading && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'cs-auth-spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
      {children}
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)
}

async function registerDriver(
  account: { name: string; email: string; password: string },
  profile: { phone: string; vehicle: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured)
    return { ok: false, error: 'Supabase is not configured. Connect a project to enable sign-up.' }

  const { data, error: authErr } = await supabase.auth.signUp({
    email: account.email.trim().toLowerCase(),
    password: account.password,
  })
  if (authErr) return { ok: false, error: authErr.message }
  if (!data.user) return { ok: false, error: 'Account creation failed. Please try again.' }

  const driverId = 'drv_' + data.user.id.slice(0, 8)
  const { error: dbErr } = await supabase.from('drivers').insert({
    id:               driverId,
    user_id:          data.user.id,
    name:             account.name.trim(),
    initials:         initials(account.name),
    email:            account.email.trim().toLowerCase(),
    phone:            profile.phone.trim(),
    vehicle:          profile.vehicle.trim(),
    status:           'offline',
    rating:           5.0,
    completed_orders: 0,
  })

  if (dbErr) {
    await supabase.auth.signOut()
    return { ok: false, error: dbErr.message }
  }

  await supabase.auth.signOut()
  return { ok: true }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  onBackToLogin: () => void
}

export function DriverSignupScreen({ onBackToLogin }: Props) {
  const [step, setStep] = useState<1 | 2 | 'done'>(1)

  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone,           setPhone]           = useState('')
  const [vehicle,         setVehicle]         = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await registerDriver({ name, email, password }, { phone, vehicle })
      if (result.ok) setStep('done')
      else setError(result.error)
    } finally {
      setLoading(false)
    }
  }

  // ── Wrapper ─────────────────────────────────────────────────────────────────
  const wrap = (body: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: T.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', fontFamily: T.font }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 12 }}>
        <LogoWordmark scale={0.72} />
        <div style={{ padding: '4px 12px', background: T.accent, borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: 1.2, fontFamily: T.mono, textTransform: 'uppercase' }}>
          Driver Portal
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 360 }}>{body}</div>
      <div style={{ marginTop: 32, fontSize: 11, color: T.slate400, fontFamily: T.mono, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        SAME-DAY · WINNIPEG · citysend.ca
      </div>
      <style>{`@keyframes cs-auth-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Step dots ────────────────────────────────────────────────────────────────
  const StepDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
      {[1, 2].map(s => (
        <div key={s} style={{ height: 6, width: step === s ? 20 : 6, borderRadius: 3, background: step === s ? T.accent : T.slate200, transition: 'all .2s ease' }} />
      ))}
    </div>
  )

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === 'done') return wrap(
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, color: T.ink }}>Application received!</div>
      <div style={{ fontSize: 14, color: T.slate500, marginTop: 10, lineHeight: 1.6, maxWidth: 280, margin: '10px auto 0' }}>
        Your account is created. A CitySend administrator will activate your driver profile before you can sign in.
      </div>
      <div style={{ marginTop: 28 }}>
        <PillButton full onClick={onBackToLogin}>Go to sign in</PillButton>
      </div>
    </div>
  )

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  if (step === 1) return wrap(
    <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <StepDots />
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: T.ink }}>Create your account.</div>
        <div style={{ fontSize: 14, color: T.slate500, marginTop: 6 }}>Step 1 of 2 — account details</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full name"        value={name}            onChange={setName}            placeholder="Alex Fontaine"  autoComplete="name" required />
        <Field label="Email"            value={email}           onChange={setEmail}           placeholder="you@example.com" type="email" autoComplete="email" required />
        <Field label="Password"         value={password}        onChange={setPassword}        placeholder="8+ characters"  type="password" autoComplete="new-password" required />
        <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" type="password" autoComplete="new-password" required />
      </div>

      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: T.err, lineHeight: 1.4 }}>{error}</div>}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillButton full type="submit">Next →</PillButton>
        <button type="button" onClick={onBackToLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.slate500, fontFamily: T.font, padding: '8px 0', textAlign: 'center' }}>
          ← Back to sign in
        </button>
      </div>
    </form>
  )

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  return wrap(
    <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <StepDots />
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: T.ink }}>Almost there.</div>
        <div style={{ fontSize: 14, color: T.slate500, marginTop: 6 }}>Step 2 of 2 — driver details</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Phone number" value={phone} onChange={setPhone} placeholder="204 555 0000" type="tel" autoComplete="tel" required />
        <SelectField
          label="Vehicle type"
          value={vehicle}
          onChange={setVehicle}
          placeholder="Select your vehicle"
          options={['Cargo Bike', 'Scooter', 'Motorcycle', 'Car', 'Cargo Van', 'Box Truck']}
        />
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', background: T.slate100, borderRadius: 10, fontSize: 12, color: T.slate500, lineHeight: 1.5 }}>
        By signing up you agree to CitySend's Driver Terms. Your account will be reviewed by an administrator before activation.
      </div>

      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: T.err, lineHeight: 1.4 }}>{error}</div>}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillButton full type="submit" loading={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </PillButton>
        <button type="button" onClick={() => { setStep(1); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.slate500, fontFamily: T.font, padding: '8px 0', textAlign: 'center' }}>
          ← Back
        </button>
      </div>
    </form>
  )
}
