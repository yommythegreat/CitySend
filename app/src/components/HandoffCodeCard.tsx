import React from 'react'

/**
 * HandoffCodeCard — the 4-digit handoff code shown to the customer.
 *
 * Displayed from booking confirmation onward (confirmation screen + tracking)
 * so the sender always has the code to relay to the recipient; the driver asks
 * for it at the door. Dark card, reads on both light and map backgrounds.
 *
 * When a recipient phone is provided, a "Text the code to recipient" button
 * opens the sender's native Messages app pre-filled with the recipient's number
 * and a short message (code + instruction + a CitySend plug). The sender taps
 * send — no server-side messaging, works for guests and registered users alike.
 */

/** Build a cross-platform sms: deep link. iOS uses `&body=`, others `?body=`. */
function smsHref(phone: string, body: string): string {
  const number = phone.replace(/[^\d+]/g, '')
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const sep = isIOS ? '&' : '?'
  return `sms:${number}${sep}body=${encodeURIComponent(body)}`
}

export function HandoffCodeCard({
  code, recipientPhone, recipientName, style,
}: {
  code: string
  recipientPhone?: string
  recipientName?: string
  style?: React.CSSProperties
}) {
  const canText = !!recipientPhone && recipientPhone.replace(/[^\d]/g, '').length >= 7

  const message =
    `Hi${recipientName ? ' ' + recipientName.split(' ')[0] : ''} — a CitySend courier is bringing you a parcel. ` +
    `Your handoff code is ${code}. Give it to the driver at the door. ` +
    `Need to send something across town? citysend.ca`

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

      {canText && (
        <a
          href={smsHref(recipientPhone!, message)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 12, padding: '11px 14px', borderRadius: 12,
            background: '#fff', color: 'var(--cs-ink)',
            fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <MessageIcon />
          Text the code to recipient
        </a>
      )}
    </div>
  )
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
