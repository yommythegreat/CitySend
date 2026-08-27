import React from 'react'

/**
 * HandoffCodeCard — the 4-digit handoff code shown to the customer.
 *
 * Displayed from booking confirmation onward (confirmation screen + tracking)
 * so the sender always has the code to relay to the recipient; the driver asks
 * for it at the door. Dark card, reads on both light and map backgrounds.
 */
export function HandoffCodeCard({ code, style }: { code: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--cs-ink)',
      borderRadius: 16,
      ...style,
    }}>
      <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        Handoff code
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {code.split('').map((d, i) => (
          <div key={i} style={{
            width: 44, height: 52, borderRadius: 10,
            background: 'rgba(255,255,255,.1)',
            border: '1.5px solid rgba(255,255,255,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, fontFamily: 'var(--cs-mono)',
            color: '#fff',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 8, lineHeight: 1.4 }}>
        Share this code with the person receiving the parcel — the driver will ask for it at the door.
      </div>
    </div>
  )
}
