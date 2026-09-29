import React from 'react'
import type { Order } from '@shared/types'
import { payoutBreakdown } from '../utils/payout'
import { money } from '../ui'

/** Earnings split: your share of the fare + tip = total. Used on the
 *  delivered summary and in history so the numbers always add up. */
export function PayoutRows({ order }: { order: Order }) {
  const p = payoutBreakdown(order)
  const row = (label: string, value: string, strong = false, tone?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: strong ? 16 : 14 }}>
      <span style={{ color: strong ? 'var(--d-ink)' : 'var(--d-ink-2)', fontWeight: strong ? 650 : 400 }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: strong ? 700 : 500, color: tone ?? 'var(--d-ink)' }}>{value}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {row(`Your ${p.sharePct}% of the ${money(p.fare)} fare`, money(p.share))}
      {p.tip > 0 && row('Tip from sender', `+${money(p.tip)}`, false, 'var(--d-ok)')}
      <div style={{ height: 1, background: 'var(--d-border)' }} />
      {row('You earned', money(p.total), true)}
    </div>
  )
}
