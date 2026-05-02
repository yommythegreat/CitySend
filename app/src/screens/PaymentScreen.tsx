import React, { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Back, Lock, Card, Plus, Shield } from '../components/Icons'
import { calcPrice, fmt } from '../utils/pricing'
import { stripePromise } from '../lib/stripe'
import type { ScreenName, AppState } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  state: AppState
  onPaymentComplete: () => void
}

// ── Card element styles matching CitySend design system ─────────────────────
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontFamily: "'Geist', -apple-system, system-ui, sans-serif",
      fontSize: '16px',
      color: '#0b1220',
      '::placeholder': { color: '#8590a6' },
    },
    invalid: { color: '#b3261e' },
  },
  hidePostalCode: false,
}

// ── Inner form (needs stripe + elements context) ────────────────────────────
function CheckoutForm({
  clientSecret, tip, onSuccess, isMock
}: {
  clientSecret: string | null
  tip: number
  onSuccess: () => void
  isMock: boolean
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error, setError]       = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const price = calcPrice(tip)

  const handlePay = async () => {
    setError(null)

    // ── Mock flow (no Stripe keys configured) ───────────────────────────────
    if (isMock || !stripe || !elements) {
      setProcessing(true)
      await new Promise(r => setTimeout(r, 1400))
      onSuccess()
      return
    }

    // ── Real Stripe flow ────────────────────────────────────────────────────
    const cardElement = elements.getElement(CardElement)
    if (!cardElement || !clientSecret) {
      setError('Payment not initialised — try again')
      return
    }

    setProcessing(true)
    const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (stripeErr) {
      setError(stripeErr.message ?? 'Payment failed')
      setProcessing(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    }
  }

  return (
    <>
      {/* Card input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          Card details
        </div>
        {isMock ? (
          <div style={{
            padding: '14px 16px', background: '#fff', border: '1.5px solid var(--cs-slate-200)',
            borderRadius: 12, fontSize: 14, color: 'var(--cs-slate-500)',
            fontFamily: 'var(--cs-mono)',
          }}>
            DEMO MODE — no card needed · any click pays
          </div>
        ) : (
          <div style={{
            padding: '14px 16px', background: '#fff',
            border: '1.5px solid var(--cs-slate-200)', borderRadius: 12,
          }}>
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        )}
        {error && (
          <div style={{ fontSize: 13, color: 'var(--cs-err)', marginTop: 8, fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>

      {/* Shield */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: 14,
        background: 'rgba(22,107,58,.06)', borderRadius: 12, marginBottom: 16,
      }}>
        <Shield size={16} color="var(--cs-ok)" />
        <div style={{ fontSize: 13, color: 'var(--cs-ok)', lineHeight: 1.4 }}>
          Protected by CitySend Shield · $500 coverage on every delivery
        </div>
      </div>

      {/* Pay button */}
      <Button
        kind="ink" size="lg" full
        onClick={handlePay}
        disabled={processing || (!isMock && !clientSecret)}
        icon={processing
          ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
          : <Lock color="#fff" size={16} />
        }
      >
        {processing ? 'Processing…' : `Pay ${fmt(price.total)}`}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--cs-slate-500)', marginTop: 10, fontFamily: 'var(--cs-mono)', letterSpacing: 0.5 }}>
        {isMock ? 'DEMO MODE — NOT A REAL CHARGE' : 'STRIPE TEST MODE — USE CARD 4242 4242 4242 4242'}
      </div>
    </>
  )
}

// ── Outer screen ────────────────────────────────────────────────────────────
export function PaymentScreen({ go, state, onPaymentComplete }: Props) {
  const [method, setMethod]       = useState<'apple' | 'card' | 'new'>('apple')
  const [tip, setTip]             = useState(2)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isMock, setIsMock]       = useState(false)
  const [intentLoading, setIntentLoading] = useState(true)

  const price = calcPrice(tip)

  // Fetch payment intent on mount (or when tip changes)
  useEffect(() => {
    setIntentLoading(true)
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCad: price.total }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.mock || !d.clientSecret) { setIsMock(true) }
        else { setClientSecret(d.clientSecret) }
      })
      .catch(() => setIsMock(true))
      .finally(() => setIntentLoading(false))
  }, [tip])

  const handlePaymentComplete = () => {
    onPaymentComplete()
    go('tracking')
  }

  const METHODS = [
    { v: 'apple' as const, l: 'Apple Pay',  sub: 'Face ID',          ic: <span style={{ fontSize: 15 }}>⬛</span> },
    { v: 'card'  as const, l: '•••• 4242',  sub: 'Visa · default',   ic: <Card size={18} /> },
    { v: 'new'   as const, l: 'Add card',   sub: 'Credit or debit',  ic: <Plus size={18} /> },
  ]

  return (
    <div className="cs-screen cs-enter-right">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('pricing')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Payment</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.8 }}>
          <Lock size={12} /> SECURE
        </div>
      </div>

      {/* Amount */}
      <div style={{ padding: '24px 20px 16px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.4, textTransform: 'uppercase' }}>Amount due</div>
        <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: -2, color: 'var(--cs-ink)', marginTop: 4, lineHeight: 1 }}>
          {fmt(price.total)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 6, fontFamily: 'var(--cs-mono)' }}>
          {fmt(price.subtotal)} + {fmt(tip)} tip · CAD
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Payment method selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Pay with
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {METHODS.map((m) => {
              const active = method === m.v
              return (
                <button
                  key={m.v}
                  onClick={() => setMethod(m.v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    background: '#fff',
                    border: `1.5px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                    borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {m.ic}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{m.l}</div>
                    <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{m.sub}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-300)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--cs-ink)' }} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tip selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Tip for your courier
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 2, 3, 5].map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                style={{
                  flex: 1, padding: '12px 0', cursor: 'pointer',
                  background: tip === t ? 'var(--cs-ink)' : '#fff',
                  color: tip === t ? '#fff' : 'var(--cs-ink)',
                  border: `1.5px solid ${tip === t ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                  borderRadius: 12, fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
                  transition: 'all .15s',
                }}
              >
                {t === 0 ? 'None' : `$${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Stripe Elements wrapper */}
        {intentLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--cs-slate-500)', fontSize: 14 }}>
            Initialising payment…
          </div>
        ) : (
          <Elements stripe={stripePromise} options={clientSecret ? { clientSecret } : undefined}>
            <CheckoutForm
              clientSecret={clientSecret}
              tip={tip}
              onSuccess={handlePaymentComplete}
              isMock={isMock}
            />
          </Elements>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
