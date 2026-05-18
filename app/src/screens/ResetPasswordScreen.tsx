import React, { useState } from 'react'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { supabase } from '../lib/supabase'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
}

export function ResetPasswordScreen({ go }: Props) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  const tooShort  = password.length > 0 && password.length < 8
  const mismatch  = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 8 && password === confirm

  const submit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) { setError(err.message); return }
      setDone(true)
      // Give user a moment to read success message, then send to home
      setTimeout(() => go('home'), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cs-screen cs-screen--paper cs-enter-right" style={{ justifyContent: 'center' }}>
      <div style={{ padding: '0 28px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: 'var(--cs-ink)' }}>
            Choose a new password
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 6, lineHeight: 1.4 }}>
            Pick something strong — at least 8 characters.
          </div>
        </div>

        {done ? (
          <div style={{
            padding: '20px 18px', background: 'rgba(22,107,58,.06)',
            borderRadius: 14, fontSize: 14, color: 'var(--cs-ok)', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Password updated</div>
            You're all set — taking you home…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <Field
                label="New password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                type="password"
                error={tooShort ? 'Must be at least 8 characters' : undefined}
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat your new password"
                type="password"
                error={mismatch ? "Passwords don't match" : undefined}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: '12px 14px',
                background: 'rgba(220,38,38,.06)', borderRadius: 10,
                fontSize: 13, color: 'var(--cs-err)', lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            <Button
              kind="ink" size="lg" full
              onClick={submit}
              disabled={!canSubmit || loading}
              icon={loading
                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
                : undefined
              }
            >
              {loading ? 'Saving…' : 'Set new password'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
