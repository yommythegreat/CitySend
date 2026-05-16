import React, { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Back, Lock, Card, Plus } from '../components/Icons'
import { fmt } from '../utils/pricing'
import { computeOrderPrice } from '../utils/serviceAvailability'
import { stripePromise } from '../lib/stripe'
import type { CityConfig } from '../config/cityConfig'
import type { Draft, ScreenName, AppState } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  state: AppState
  draft: Draft
  cityConfig: CityConfig
  onPaymentComplete: (tip: number) => Promise<void>
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

// ── Mode notice badge ─────────────────────────────────────────────────────────
function ModeNotice({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', fontSize: 11, color, marginTop: 10, fontFamily: 'var(--cs-mono)', letterSpacing: 0.5 }}>
      {label}
    </div>
  )
}

// ── Inner form (needs stripe + elements context) ────────────────────────────
function CheckoutForm({
  clientSecret, priceTotal, onSuccess, isMock
}: {
  clientSecret: string | null
  priceTotal: number
  onSuccess: () => Promise<void>
  isMock: boolean
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error, setError]           = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handlePay = async () => {
    setError(null)

    // ── Mock flow (no Stripe keys configured) ───────────────────────────────
    if (isMock || !stripe || !elements) {
      setProcessing(true)
      await new Promise(r => setTimeout(r, 1400))
      await onSuccess()
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
      await onSuccess()
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
        {processing ? 'Processing…' : `Pay ${fmt(priceTotal)}`}
      </Button>
      {/* Mode badge — only shown in non-live environments */}
      {(() => {
        const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
        if (isMock)                            return <ModeNotice label="DEMO MODE — NOT A REAL CHARGE"        color="#6b7280" />
        if (pubKey?.startsWith('pk_test_'))    return <ModeNotice label="TEST MODE — USE CARD 4242 4242 4242 4242" color="#d97706" />
        return null  // live key — no badge shown
      })()}
    </>
  )
}

// ── Outer screen ────────────────────────────────────────────────────────────
export function PaymentScreen({ go, state, draft, cityConfig, onPaymentComplete }: Props) {
  const [method, setMethod]             = useState<'apple' | 'card' | 'new'>('apple')
  const [tip, setTip]                   = useState(2)
  const [customTipRaw, setCustomTipRaw] = useState('')
  const [showCustom, setShowCustom]     = useState(false)
  const [customTipErr, setCustomTipErr] = useState('')
  const [taxTipOpen, setTaxTipOpen]     = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isMock, setIsMock]             = useState(false)
  const [intentLoading, setIntentLoading] = useState(true)

  // ── Compute price using actual draft + cityConfig ──────────────────────────
  const distKm = draft.route ? draft.route.distanceM / 1000 : 0
  const price = computeOrderPrice({
    cityConfig,
    distKm,
    parcelSize: draft.parcel.size,
    fragile:    draft.parcel.fragile,
    tip,
  })

  // ── Tax tooltip label ──────────────────────────────────────────────────────
  const taxTooltip = (() => {
    const parts: string[] = []
    if (price.gst > 0) parts.push(`GST ${(cityConfig.taxRates.gst * 100).toFixed(0)}%`)
    if (price.pst > 0) parts.push(`PST ${(cityConfig.taxRates.pst * 100).toFixed(0)}%`)
    if (price.hst > 0) parts.push(`HST ${(cityConfig.taxRates.hst * 100).toFixed(0)}%`)
    if (price.qst > 0) parts.push(`QST ${(cityConfig.taxRates.qst * 100).toFixed(2)}%`)
    return parts.length ? `Taxes: ${parts.join(' + ')} — applied to subtotal before tip.` : ''
  })()

  // Fetch payment intent on mount or when total changes
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

  const handlePaymentComplete = async () => {
    console.log('[Payment] completing — tip:', tip, 'total:', price.total)
    await onPaymentComplete(tip)
    console.log('[Payment] order written — navigating to tracking')
    go('tracking')
  }

  // ── Custom tip handling ────────────────────────────────────────────────────
  const applyCustomTip = () => {
    const parsed = parseFloat(customTipRaw.replace(/[^0-9.]/g, ''))
    if (isNaN(parsed) || parsed < 0) {
      setCustomTipErr('Enter a valid amount.')
      return
    }
    if (parsed > 100) {
      setCustomTipErr('Tip cannot exceed $100.')
      return
    }
    setCustomTipErr('')
    setTip(Math.round(parsed * 100) / 100)
    setShowCustom(false)
  }

  const selectPresetTip = (t: number) => {
    setTip(t)
    setShowCustom(false)
    setCustomTipRaw('')
    setCustomTipErr('')
  }

  const METHODS = [
    { v: 'apple' as const, l: 'Apple Pay',  sub: 'Face ID',          ic: <span style={{ fontSize: 15 }}>⬛</span> },
    { v: 'card'  as const, l: '•••• 4242',  sub: 'Visa · default',   ic: <Card size={18} /> },
    { v: 'new'   as const, l: 'Add card',   sub: 'Credit or debit',  ic: <Plus size={18} /> },
  ]

  const PRESET_TIPS = [0, 2, 3, 5]
  const isCustomActive = showCustom || !PRESET_TIPS.includes(tip)

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
        <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 6, fontFamily: 'var(--cs-mono)', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>{fmt(price.subtotalWithTax)} + {fmt(tip)} tip · CAD</span>
          {taxTooltip && (
            <>
              <button
                onClick={() => setTaxTipOpen(o => !o)}
                style={{
                  background: 'none', border: 'none', padding: '0 2px',
                  cursor: 'pointer', fontSize: 12,
                  color: taxTipOpen ? 'var(--cs-ink)' : 'var(--cs-slate-400)',
                  lineHeight: 1, display: 'flex', alignItems: 'center',
                }}
                aria-label="Tax info"
              >
                ⓘ
              </button>
              {taxTipOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 20,
                  marginTop: 6, width: 240,
                  background: 'var(--cs-ink)', color: '#fff',
                  fontSize: 12, lineHeight: 1.5,
                  padding: '10px 12px', borderRadius: 10,
                  boxShadow: '0 8px 24px -8px rgba(11,18,32,.35)',
                }}>
                  {taxTooltip}
                </div>
              )}
            </>
          )}
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
            {PRESET_TIPS.map((t) => (
              <button
                key={t}
                onClick={() => selectPresetTip(t)}
                style={{
                  flex: 1, padding: '12px 0', cursor: 'pointer',
                  background: !isCustomActive && tip === t ? 'var(--cs-ink)' : '#fff',
                  color: !isCustomActive && tip === t ? '#fff' : 'var(--cs-ink)',
                  border: `1.5px solid ${!isCustomActive && tip === t ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                  borderRadius: 12, fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
                  transition: 'all .15s',
                }}
              >
                {t === 0 ? 'None' : `$${t}`}
              </button>
            ))}
            {/* Custom tip button */}
            <button
              onClick={() => { setShowCustom(true); setCustomTipRaw(isCustomActive ? String(tip) : '') }}
              style={{
                flex: 1, padding: '12px 0', cursor: 'pointer',
                background: isCustomActive ? 'var(--cs-ink)' : '#fff',
                color: isCustomActive ? '#fff' : 'var(--cs-ink)',
                border: `1.5px solid ${isCustomActive ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                borderRadius: 12, fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
                transition: 'all .15s',
              }}
            >
              {isCustomActive && !showCustom ? fmt(tip) : 'Custom'}
            </button>
          </div>

          {/* Custom tip input */}
          {showCustom && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', height: 48,
                  border: `1.5px solid ${customTipErr ? 'var(--cs-err)' : 'var(--cs-ink)'}`,
                  borderRadius: 12, overflow: 'hidden', background: '#fff',
                }}>
                  <span style={{ padding: '0 10px 0 14px', color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)', fontSize: 15 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    value={customTipRaw}
                    onChange={e => { setCustomTipRaw(e.target.value); setCustomTipErr('') }}
                    onKeyDown={e => e.key === 'Enter' && applyCustomTip()}
                    onBlur={applyCustomTip}
                    autoFocus
                    style={{
                      flex: 1, border: 'none', outline: 'none',
                      fontFamily: 'var(--cs-font)', fontSize: 16, color: 'var(--cs-ink)',
                      background: 'transparent', minWidth: 0,
                    }}
                  />
                </div>
                {customTipErr && (
                  <div style={{ fontSize: 12, color: 'var(--cs-err)', marginTop: 4, paddingLeft: 2 }}>
                    {customTipErr}
                  </div>
                )}
              </div>
              <button
                onClick={applyCustomTip}
                style={{
                  height: 48, padding: '0 16px',
                  background: 'var(--cs-ink)', color: '#fff',
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Apply
              </button>
            </div>
          )}
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
              priceTotal={price.total}
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
