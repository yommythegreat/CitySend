import React, { useState } from 'react'
import { IconButton } from '../components/IconButton'
import { Back } from '../components/Icons'
import { getComingSoonCities, getLiveCityName } from '../utils/serviceAvailability'
import type { CityConfig } from '../config/cityConfig'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  /** The currently selected city's config (always isLive === false when shown). */
  cityConfig: CityConfig
  /** Full city list from Supabase — used for live city name and coming-soon list. */
  configs: CityConfig[]
}

// ── Interest form (notify-me) ─────────────────────────────────────────────────

function NotifyForm({ cityName }: { cityName: string }) {
  const STORAGE_KEY = 'cs_city_interest'
  const [contact,   setContact]   = useState('')
  const [submitted, setSubmitted] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
      return stored.includes(cityName)
    } catch { return false }
  })
  const [err, setErr] = useState<string | null>(null)

  const handleNotify = () => {
    const v = contact.trim()
    if (!v) { setErr('Enter your email or phone number.'); return }
    const isEmail = v.includes('@')
    const isPhone = /^\+?[\d\s\-().]{7,}$/.test(v)
    if (!isEmail && !isPhone) { setErr('Enter a valid email or phone number.'); return }

    // Persist interest in sessionStorage (mock — no real backend call)
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
      if (!stored.includes(cityName)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, cityName]))
      }
    } catch {}

    setSubmitted(true)
    setErr(null)
  }

  if (submitted) {
    return (
      <div style={{
        background: 'rgba(22,107,58,.07)', borderRadius: 18,
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cs-ok)', marginBottom: 6 }}>
          You're on the list!
        </div>
        <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', lineHeight: 1.45 }}>
          We'll reach out as soon as CitySend launches in {cityName}.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 18,
      border: '1px solid var(--cs-slate-100)', padding: 20,
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', marginBottom: 4 }}>
        Get notified when we launch
      </div>
      <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginBottom: 16, lineHeight: 1.4 }}>
        Leave your email or phone and we'll reach out first.
      </div>

      <input
        value={contact}
        onChange={e => { setContact(e.target.value); setErr(null) }}
        placeholder="you@example.com or +1 204 555 0100"
        style={{
          width: '100%', padding: '12px 14px',
          border: '1.5px solid var(--cs-slate-200)',
          borderRadius: 10, fontSize: 15,
          fontFamily: 'var(--cs-font)', outline: 'none',
          boxSizing: 'border-box', color: 'var(--cs-ink)',
          marginBottom: err ? 8 : 14,
        }}
        autoComplete="email"
        inputMode="email"
      />

      {err && (
        <div style={{ fontSize: 13, color: 'var(--cs-err)', marginBottom: 10 }}>{err}</div>
      )}

      <button
        onClick={handleNotify}
        style={{
          width: '100%', padding: '13px 0',
          border: 'none', borderRadius: 12,
          background: 'var(--cs-ink)', color: '#fff',
          fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Notify me
      </button>
    </div>
  )
}

// ── CityBlockedScreen ─────────────────────────────────────────────────────────

export function CityBlockedScreen({ go, cityConfig, configs }: Props) {
  const comingSoonCities = getComingSoonCities(configs).filter(c => c.cityId !== cityConfig.cityId)
  const liveCityName = getLiveCityName(configs)

  return (
    <div className="cs-screen cs-enter-up">
      {/* Back button */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, padding: '0 24px 40px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        overflowY: 'auto', scrollbarWidth: 'none',
      }}>
        {/* Illustration + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 14 }}>📍</div>
          <div style={{
            fontSize: 26, fontWeight: 700, letterSpacing: -0.7,
            color: 'var(--cs-ink)', lineHeight: 1.2, marginBottom: 10,
          }}>
            {cityConfig.cityName} is coming soon
          </div>
          <div style={{
            fontSize: 15, color: 'var(--cs-slate-500)', lineHeight: 1.55,
            maxWidth: 300, margin: '0 auto',
          }}>
            CitySend is launching in {cityConfig.cityName}, {cityConfig.province} soon.
            Switch to {liveCityName} to place orders now.
          </div>
        </div>

        {/* Notify-me form */}
        <div style={{ marginBottom: 14 }}>
          <NotifyForm cityName={cityConfig.cityName} />
        </div>

        {/* Switch to live city */}
        <button
          onClick={() => go('home')}
          style={{
            width: '100%', padding: '14px 0',
            border: '1.5px solid var(--cs-slate-200)', borderRadius: 14,
            background: '#fff', fontFamily: 'var(--cs-font)',
            fontSize: 15, color: 'var(--cs-slate-600)', cursor: 'pointer',
            marginBottom: comingSoonCities.length > 0 ? 24 : 0,
          }}
        >
          Back to home
        </button>

        {/* Other coming-soon cities */}
        {comingSoonCities.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>
              Also launching soon
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {comingSoonCities.slice(0, 5).map(c => (
                <span
                  key={c.cityId}
                  style={{
                    fontSize: 13, padding: '5px 12px',
                    background: 'var(--cs-slate-100)',
                    borderRadius: 999, color: 'var(--cs-slate-600)',
                    fontFamily: 'var(--cs-font)',
                  }}
                >
                  {c.cityName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
