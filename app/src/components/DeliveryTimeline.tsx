import React from 'react'

/**
 * DeliveryTimeline — vertical stage list for scheduled (Morning/Evening)
 * deliveries. Shown on the Scheduled confirmation screen and on the tracking
 * screen while the order is pre-dispatch (scheduled/preparing). Once a courier
 * is assigned the tracking screen swaps to the live map layout instead.
 */

type Status =
  | 'scheduled' | 'preparing' | 'new' | 'offered' | 'assigned'
  | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'

interface Stage {
  key: string
  label: (status: Status) => string
  /** statuses at which this stage is the *current* (active) one */
  activeAt: Status[]
  /** index used to decide done/pending relative to the current stage */
}

const STAGES: Stage[] = [
  { key: 'confirmed', label: () => 'Order confirmed',                       activeAt: [] },
  { key: 'window',    label: (s) => s === 'preparing' ? 'Preparing your delivery' : 'Waiting for delivery window', activeAt: ['scheduled', 'preparing'] },
  { key: 'assigned',  label: () => 'Courier assigned',                       activeAt: ['new', 'offered', 'assigned'] },
  { key: 'picked_up', label: () => 'Parcel picked up',                       activeAt: ['picked_up'] },
  { key: 'transit',   label: () => 'On the way',                             activeAt: ['in_transit'] },
  { key: 'delivered', label: () => 'Delivered',                              activeAt: ['delivered'] },
]

function currentIndex(status: Status): number {
  const i = STAGES.findIndex(s => s.activeAt.includes(status))
  // 'confirmed' has no activeAt — the order existing means it's at least stage 1.
  return i === -1 ? (status === 'delivered' ? STAGES.length - 1 : 1) : i
}

export function DeliveryTimeline({ status }: { status: Status }) {
  const cur = currentIndex(status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {STAGES.map((stage, i) => {
        const done   = i < cur
        const active = i === cur
        const dotColor = done ? 'var(--cs-accent)' : active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'
        return (
          <div key={stage.key} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
            {/* Rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
              <div style={{
                width: active ? 14 : 12, height: active ? 14 : 12, borderRadius: '50%',
                background: done || active ? dotColor : '#fff',
                border: `2px solid ${dotColor}`,
                marginTop: 3, flexShrink: 0,
                boxShadow: active ? '0 0 0 4px rgba(11,18,32,.08)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done && <span style={{ color: '#fff', fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 22, background: done ? 'var(--cs-accent)' : 'var(--cs-slate-200)', marginTop: 2 }} />
              )}
            </div>
            {/* Label */}
            <div style={{ paddingBottom: 18 }}>
              <div style={{
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: done ? 'var(--cs-slate-500)' : active ? 'var(--cs-ink)' : 'var(--cs-slate-400)',
              }}>
                {stage.label(status)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
