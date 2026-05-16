import React, { useState } from 'react'
import { IconButton } from '../components/IconButton'
import { Back, Card, Receipt } from '../components/Icons'
import { GuestPrompt } from '../components/GuestPrompt'
import type { AppState, AuthUser, PaymentMethod, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  state: AppState
  user: AuthUser | null
}

const BRAND_LABELS: Record<PaymentMethod['brand'], string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
}

function fmt(n: number) {
  return n.toFixed(2)
}

function computeBreakdown(total: number) {
  // Back-calculate from total-inclusive price: tax = total × 5/105
  const tax      = Math.round((total * 5 / 105) * 100) / 100
  const subtotal = Math.round((total - tax) * 100) / 100
  return { subtotal, tax, tip: 0 }
}

// ── Receipt detail ────────────────────────────────────────────────────────────

interface ReceiptViewProps {
  deliveryId: string
  date: string
  recipientName: string
  total: number
  cardLabel: string
  onBack: () => void
}

function ReceiptView({ deliveryId, date, recipientName, total, cardLabel, onBack }: ReceiptViewProps) {
  const { subtotal, tax, tip } = computeBreakdown(total)

  return (
    <div className="cs-screen cs-enter-right">
      {/* Header */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={onBack}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Receipt</div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 28 }}>

          {/* Amount hero */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: 'var(--cs-slate-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Receipt size={24} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.2, color: 'var(--cs-ink)' }}>
              ${fmt(total)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 6, fontFamily: 'var(--cs-mono)' }}>
              CS—{deliveryId} · {date}
            </div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-400)', marginTop: 2 }}>
              Delivery to {recipientName}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 14 }}>
            {[
              { label: 'Subtotal',  value: `$${fmt(subtotal)}` },
              { label: 'GST (5%)', value: `$${fmt(tax)}`      },
              { label: 'Tip',       value: `$${fmt(tip)}`      },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 16px',
                  borderTop: i > 0 ? '1px solid var(--cs-slate-100)' : 'none',
                }}
              >
                <span style={{ fontSize: 15, color: 'var(--cs-slate-600)' }}>{row.label}</span>
                <span style={{ fontSize: 15, color: 'var(--cs-ink)', fontFamily: 'var(--cs-mono)' }}>{row.value}</span>
              </div>
            ))}
            {/* Total row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              borderTop: '2px solid var(--cs-slate-100)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cs-ink)' }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cs-ink)', fontFamily: 'var(--cs-mono)' }}>
                ${fmt(total)}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)',
            padding: '13px 16px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              Payment method
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Card size={15} color="var(--cs-slate-400)" />
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{cardLabel}</span>
            </div>
          </div>

          {/* Transaction reference */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)',
            padding: '13px 16px', marginBottom: 32,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              Transaction reference
            </div>
            <div style={{ fontSize: 14, color: 'var(--cs-ink)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.3 }}>
              TXN-{deliveryId}-CS
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Billing list ──────────────────────────────────────────────────────────────

export function BillingScreen({ go, state, user }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Guests have no billing history — show a signup gate
  if (user?.id === 'guest') {
    return (
      <div className="cs-screen cs-enter-right">
        <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <IconButton onClick={() => go('settings')}><Back /></IconButton>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Billing history</div>
        </div>
        <GuestPrompt
          go={go}
          title="Your receipts, always here."
          message="Create a free CitySend account to view past receipts, download invoices, and track every delivery you've sent."
          onDismiss={() => go('settings')}
        />
      </div>
    )
  }

  // Only show deliveries that have a financial record (non-canceled)
  const receipts = state.pastDeliveries.filter(d => d.status !== 'canceled')

  const defaultCard = state.paymentMethods.find(m => m.isDefault) ?? state.paymentMethods[0]
  const cardLabel   = defaultCard
    ? `${BRAND_LABELS[defaultCard.brand]} •••• ${defaultCard.last4}`
    : 'Card on file'

  // Show receipt detail sub-view (back stays within billing)
  if (openId) {
    const d = receipts.find(r => r.id === openId)!
    return (
      <ReceiptView
        deliveryId={d.id}
        date={d.date}
        recipientName={d.to.name}
        total={parseFloat(d.price)}
        cardLabel={cardLabel}
        onBack={() => setOpenId(null)}
      />
    )
  }

  return (
    <div className="cs-screen cs-enter-right">
      {/* Header */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('settings')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Billing history</div>
      </div>

      {/* Title */}
      <div style={{ padding: '20px 20px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, color: 'var(--cs-ink)' }}>
          Billing history
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 4 }}>
          {receipts.length} {receipts.length === 1 ? 'receipt' : 'receipts'}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '0 20px 40px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {receipts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: 'var(--cs-slate-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={22} color="var(--cs-slate-400)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cs-ink)' }}>No receipts yet</div>
            <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', textAlign: 'center' }}>
              Completed deliveries will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {receipts.map(d => {
              const total = parseFloat(d.price)
              return (
                <div
                  key={d.id}
                  style={{
                    background: '#fff', borderRadius: 16,
                    border: '1px solid var(--cs-slate-100)', padding: 16,
                  }}
                >
                  {/* Top row: amount + date/id */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cs-ink)', letterSpacing: -0.5 }}>
                        ${fmt(total)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>
                        {d.to.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)' }}>
                        {d.date}
                      </div>
                      <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-400)', marginTop: 2 }}>
                        CS—{d.id}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: card + view receipt */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 12, borderTop: '1px solid var(--cs-slate-100)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Card size={13} color="var(--cs-slate-400)" />
                      <span style={{ fontSize: 12, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>
                        {cardLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => setOpenId(d.id)}
                      style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--cs-accent)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--cs-font)', padding: 0,
                      }}
                    >
                      View receipt →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
