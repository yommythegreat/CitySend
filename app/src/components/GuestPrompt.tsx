import React from 'react'
import type { ScreenName } from '../types'

interface Props {
  go:        (screen: ScreenName) => void
  title?:    string
  message?:  string
  /** Show a "Maybe later" back button — pass the callback to handle it */
  onDismiss?: () => void
}

/**
 * Full-screen gate shown when a guest tries to access a registered-only feature.
 * Uses flex: 1 so it fills remaining height after the top bar, never obscuring it.
 */
export function GuestPrompt({
  go,
  title   = 'Save this for next time?',
  message = 'Create a free CitySend account to save places, view receipts, track past deliveries, and make your next send faster.',
  onDismiss,
}: Props) {
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px 32px',
      textAlign: 'center',
      overflowY: 'auto',
    }}>
      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 36,
        background: 'var(--cs-slate-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        {/* CitySend user icon — 20×20 stroke */}
        <svg width="32" height="32" viewBox="0 0 20 20" fill="none"
             stroke="var(--cs-slate-400)" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="7" r="3"/>
          <path d="M4 17c0-3 3-5 6-5s6 2 6 5"/>
        </svg>
      </div>

      <div style={{
        fontSize: 22, fontWeight: 600, letterSpacing: -0.5,
        color: 'var(--cs-ink)', lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 14, color: 'var(--cs-slate-500)',
        marginTop: 12, lineHeight: 1.65, maxWidth: 300,
      }}>
        {message}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 10, marginTop: 32, width: '100%', maxWidth: 320,
      }}>
        <button
          onClick={() => go('auth')}
          style={{
            height: 52, background: 'var(--cs-ink)', color: '#fff',
            border: 'none', borderRadius: 14, fontFamily: 'var(--cs-font)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: -0.2,
          }}
        >
          Create account
        </button>
        <button
          onClick={() => go('auth')}
          style={{
            height: 52, background: 'transparent', color: 'var(--cs-ink)',
            border: '1.5px solid var(--cs-slate-200)', borderRadius: 14,
            fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 500,
            cursor: 'pointer', letterSpacing: -0.2,
          }}
        >
          Sign in
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              height: 44, background: 'transparent', border: 'none',
              fontFamily: 'var(--cs-font)', fontSize: 14,
              color: 'var(--cs-slate-400)', cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  )
}
