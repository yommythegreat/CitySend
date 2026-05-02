import React, { useState } from 'react'
import { IconButton } from '../components/IconButton'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { Back } from '../components/Icons'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
}

export function ForgotPasswordScreen({ go }: Props) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  const valid = email.trim().length > 4

  const submit = async () => {
    if (!valid || loading) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="cs-screen cs-screen--paper cs-enter-right" style={{ justifyContent: 'center' }}>
      <div style={{ padding: '0 28px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 28 }}>
          <IconButton onClick={() => go('auth')}><Back /></IconButton>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: 'var(--cs-ink)' }}>
            Reset password
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 6, lineHeight: 1.4 }}>
            Enter the email linked to your account and we'll send reset instructions.
          </div>
        </div>

        {sent ? (
          <div style={{
            padding: '20px 18px', background: 'rgba(22,107,58,.06)',
            borderRadius: 14, fontSize: 14, color: 'var(--cs-ok)', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Check your inbox</div>
            If this email exists, we'll send reset instructions.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
              />
            </div>
            <Button
              kind="ink" size="lg" full
              onClick={submit}
              disabled={!valid || loading}
              icon={loading
                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
                : undefined
              }
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}

        {sent && (
          <button
            onClick={() => go('auth')}
            style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)', textAlign: 'center' }}
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  )
}
