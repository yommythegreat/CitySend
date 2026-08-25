import React, { useState, useEffect, useRef } from 'react'
import { Elements, CardElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { PaymentRequest } from '@stripe/stripe-js'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Back, Lock } from '../components/Icons'
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
  onPaymentComplete: (tip: number, authorizedTotal?: number) => Promise<void>
  /** Resolves true only once the order can be saved (guest → anon session
   *  established). Checked before charging so we never take money we can't
   *  save an order for. */
  ensureReadyToPay: () => Promise<boolean>
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
  clientSecret, priceTotal, onSuccess, isMock, ensureReadyToPay
}: {
  clientSecret: string | null
  priceTotal: number
  /** chargedTotal = the amount Stripe actually captured (confirmed intent), in
   *  dollars. Undefined in mock/dev where nothing is charged. */
  onSuccess: (chargedTotal?: number) => Promise<void>
  isMock: boolean
  ensureReadyToPay: () => Promise<boolean>
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,          setError]          = useState<string | null>(null)
  const [processing,     setProcessing]     = useState(false)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  // Guest checkout can only save an order once an anonymous session exists.
  // Establish it up-front so the pay controls stay disabled until we know the
  // order will be saveable — otherwise a charge could succeed with no order.
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'error'>('checking')

  useEffect(() => {
    let cancelled = false
    ensureReadyToPay()
      .then(ok => { if (!cancelled) setSessionState(ok ? 'ready' : 'error') })
      .catch(() => { if (!cancelled) setSessionState('error') })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retrySession = () => {
    setSessionState('checking')
    setError(null)
    ensureReadyToPay()
      .then(ok => setSessionState(ok ? 'ready' : 'error'))
      .catch(() => setSessionState('error'))
  }

  // Keep clientSecret in a ref so the paymentmethod handler always uses the latest
  const clientSecretRef = useRef(clientSecret)
  useEffect(() => { clientSecretRef.current = clientSecret }, [clientSecret])

  // Create the Payment Request (Apple Pay / Google Pay) once when stripe loads
  useEffect(() => {
    if (!stripe || isMock) return

    const pr = stripe.paymentRequest({
      country:           'CA',
      currency:          'cad',
      total:             { label: 'CitySend Delivery', amount: Math.round(priceTotal * 100) },
      requestPayerName:  false,
      requestPayerEmail: false,
    })

    pr.canMakePayment().then(result => {
      if (result) setPaymentRequest(pr)
    })

    pr.on('paymentmethod', async (e) => {
      const secret = clientSecretRef.current
      if (!secret) {
        e.complete('fail')
        setError('Payment not ready — please try again')
        return
      }
      // Never charge unless the order can be saved (guest → anon session).
      if (!(await ensureReadyToPay())) {
        e.complete('fail')
        setSessionState('error')
        setError('Could not start a secure session. Please retry.')
        return
      }
      setProcessing(true)

      // Confirm without triggering 3DS redirect first
      const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
        secret,
        { payment_method: e.paymentMethod.id },
        { handleActions: false },
      )

      if (confirmErr) {
        e.complete('fail')
        setError(confirmErr.message ?? 'Payment failed')
        setProcessing(false)
        return
      }

      e.complete('success')

      // If 3DS is required, handle it now (rare for Apple Pay but possible)
      if (paymentIntent?.status === 'requires_action') {
        const { error: actionErr } = await stripe.confirmCardPayment(secret)
        if (actionErr) {
          setError(actionErr.message ?? 'Authentication failed')
          setProcessing(false)
          return
        }
      }

      // Save the order against the amount Stripe actually captured.
      await onSuccess(typeof paymentIntent?.amount === 'number' ? paymentIntent.amount / 100 : undefined)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, isMock])

  // Sync amount to payment request whenever the tip (price) changes
  useEffect(() => {
    paymentRequest?.update({
      total: { label: 'CitySend Delivery', amount: Math.round(priceTotal * 100) },
    })
  }, [priceTotal, paymentRequest])

  // ── Card pay handler ─────────────────────────────────────────────────────────
  const handleCardPay = async () => {
    setError(null)

    // Never charge unless the order can be saved (guest → anon session).
    if (!(await ensureReadyToPay())) {
      setSessionState('error')
      setError('Could not start a secure session. Please retry.')
      return
    }

    if (isMock || !stripe || !elements) {
      setProcessing(true)
      await new Promise(r => setTimeout(r, 1400))
      await onSuccess()
      return
    }

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
      // Save the order against the amount Stripe actually captured.
      await onSuccess(typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : undefined)
    }
  }

  const pubKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

  return (
    <>
      {/* Session-readiness notice — a guest's anonymous session must exist
          before we let any charge happen, or the order can't be saved. */}
      {sessionState === 'error' && (
        <div style={{
          padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d',
          borderRadius: 12, fontSize: 13, color: '#92400e', lineHeight: 1.5, marginBottom: 16,
        }}>
          Could not start a secure checkout session, so payment is paused to avoid
          charging you without saving your order.{' '}
          <button
            onClick={retrySession}
            style={{ background: 'none', border: 'none', padding: 0, color: '#92400e', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
          >Retry</button>
        </div>
      )}

      {/* ── Express checkout (Apple Pay / Google Pay) — shown when available ── */}
      {paymentRequest && sessionState === 'ready' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
              Express checkout
            </div>
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: { type: 'buy', theme: 'dark', height: '52px' },
                },
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--cs-slate-200)' }} />
            <span style={{ fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.6 }}>
              or pay by card
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--cs-slate-200)' }} />
          </div>
        </>
      )}

      {/* ── Card input ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          Card details
        </div>
        {isMock ? (
          <div style={{
            padding: '14px 16px', background: '#fff', border: '1.5px solid var(--cs-slate-200)',
            borderRadius: 12, fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)',
          }}>
            DEMO MODE — no card needed · any click pays
          </div>
        ) : (
          <div style={{ padding: '14px 16px', background: '#fff', border: '1.5px solid var(--cs-slate-200)', borderRadius: 12 }}>
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        )}
        {error && (
          <div style={{ fontSize: 13, color: 'var(--cs-err)', marginTop: 8, fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Pay button ───────────────────────────────────────────────────────── */}
      <Button
        kind="ink" size="lg" full
        onClick={handleCardPay}
        disabled={processing || sessionState !== 'ready' || (!isMock && !clientSecret)}
        icon={(processing || sessionState === 'checking')
          ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
          : <Lock color="#fff" size={16} />
        }
      >
        {processing            ? 'Processing…'
          : sessionState === 'checking' ? 'Preparing secure checkout…'
          : sessionState === 'error'    ? 'Checkout unavailable'
          : `Pay ${fmt(priceTotal)}`}
      </Button>

      {/* Mode badge */}
      {isMock && <ModeNotice label="DEMO MODE — NOT A REAL CHARGE" color="#6b7280" />}
      {!isMock && pubKey?.startsWith('pk_test_') && (
        <ModeNotice label="TEST MODE — USE CARD 4242 4242 4242 4242" color="#d97706" />
      )}
    </>
  )
}

// ── Outer screen ────────────────────────────────────────────────────────────
export function PaymentScreen({ go, state, draft, cityConfig, onPaymentComplete, ensureReadyToPay }: Props) {
  const [tip, setTip]                   = useState(2)
  const [customTipRaw, setCustomTipRaw] = useState('')
  const [showCustom, setShowCustom]     = useState(false)
  const [customTipErr, setCustomTipErr] = useState('')
  const [taxTipOpen, setTaxTipOpen]     = useState(false)
  const [clientSecret,    setClientSecret]    = useState<string | null>(null)
  const [authorizedTotal, setAuthorizedTotal] = useState<number | undefined>(undefined)
  const [isMock,          setIsMock]          = useState(false)
  const [intentLoading,   setIntentLoading]   = useState(true)
  const [orderError,      setOrderError]      = useState<string | null>(null)

  // ── Compute price using actual draft + cityConfig ──────────────────────────
  const distKm = draft.route ? draft.route.distanceM / 1000 : 0
  const price = computeOrderPrice({
    cityConfig,
    distKm,
    parcelSize: draft.parcel.size,
    fragile:    draft.parcel.fragile,
    tip,
    deliveryWindow: draft.deliveryWindow ?? 'morning',
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

  // Fetch payment intent on mount or when tip changes.
  // We send pricing inputs (not the computed total) so the server can
  // recompute the authoritative charge amount independently — preventing
  // a tampered client from paying an arbitrary amount.
  //
  // Each tip change supersedes the previous intent: we drop the old client
  // secret immediately (so a stale amount can never be the one confirmed) and
  // ignore any out-of-order response from a superseded request via reqId — so
  // the intent that gets charged always matches the current tip. Without this,
  // paying just after a tip change could confirm the previous amount while the
  // order saved the new one (charge/record divergence).
  const intentReqRef = useRef(0)
  useEffect(() => {
    const reqId = ++intentReqRef.current
    setIntentLoading(true)
    setClientSecret(null)
    setAuthorizedTotal(undefined)
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cityId:         cityConfig.cityId,
        distanceKm:     distKm,
        parcelSize:     draft.parcel.size,
        fragile:        draft.parcel.fragile,
        tip,
        deliveryWindow: draft.deliveryWindow ?? 'morning',
        amountCad:      price.total,  // fallback if server can't reach Supabase
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (reqId !== intentReqRef.current) return  // superseded by a newer tip
        if (d.mock || !d.clientSecret) {
          if (import.meta.env.DEV) { setIsMock(true) }
          // In production, leave clientSecret null — CheckoutForm will show an error
        } else {
          setClientSecret(d.clientSecret)
          if (typeof d.authorizedTotal === 'number') setAuthorizedTotal(d.authorizedTotal)
        }
      })
      .catch(() => {
        if (reqId !== intentReqRef.current) return
        if (import.meta.env.DEV) { setIsMock(true) }
        // In production, leave clientSecret null — CheckoutForm will show an error
      })
      .finally(() => {
        if (reqId === intentReqRef.current) setIntentLoading(false)
      })
  }, [tip])

  const handlePaymentComplete = async (chargedTotal?: number) => {
    setOrderError(null)
    try {
      // Prefer the amount Stripe actually charged (from the confirmed intent)
      // over the client's tracked value, so the saved order can never disagree
      // with the charge.
      await onPaymentComplete(tip, chargedTotal ?? authorizedTotal)
      // Express → straight to live tracking (finding driver). Morning/Evening →
      // the Scheduled Delivery confirmation screen (no live tracking yet).
      go((draft.deliveryWindow ?? 'morning') === 'express' ? 'tracking' : 'scheduled')
    } catch (err: any) {
      // Payment succeeded but order creation failed (e.g. not signed in).
      // Show a recoverable error — the user must sign in and contact support.
      setOrderError(
        'Your payment was processed but we could not save your order. ' +
        'Please sign in and contact support@citysend.ca with your receipt.'
      )
    }
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

        {/* Order creation error — payment succeeded but DB write failed */}
        {orderError && (
          <div style={{
            padding: '12px 14px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: 12,
            fontSize: 13, color: '#dc2626', lineHeight: 1.5, marginBottom: 16,
          }}>
            <strong>Payment processed — order not saved.</strong><br />
            {orderError}
          </div>
        )}

        {/* Stripe Elements wrapper */}
        {intentLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--cs-slate-500)', fontSize: 14 }}>
            Initialising payment…
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              clientSecret={clientSecret}
              priceTotal={price.total}
              onSuccess={handlePaymentComplete}
              isMock={isMock}
              ensureReadyToPay={ensureReadyToPay}
            />
          </Elements>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
