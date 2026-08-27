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
 * and a short message. The message is delivery-type aware: Express says the
 * courier is on the way; scheduled says which window it's coming in (so a
 * recipient who reads it hours early isn't misled into expecting it now).
 */

type DeliveryType = 'express' | 'morning' | 'evening' | undefined

const ADVERT = 'Need to send something across town? visit www.citysend.ca'

/** e.g. "this evening (6–10 PM)", "tomorrow morning (10 AM–2 PM)",
 *  "evening (6–10 PM) on Wed, Aug 27" — never misleadingly relative. */
function windowPhrase(type: 'morning' | 'evening', windowStart?: string): string {
  const period    = type === 'evening' ? 'evening' : 'morning'
  const timeRange  = type === 'evening' ? '6–10 PM' : '10 AM–2 PM'
  if (!windowStart) return `in the ${period} (${timeRange})`

  const start = new Date(windowStart)
  const now   = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86_400_000)

  const day =
    diffDays <= 0 ? `this ${period}`
    : diffDays === 1 ? `tomorrow ${period}`
    : `${period} on ${start.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}`

  return `${day} (${timeRange})`
}

function buildMessage(code: string, deliveryType: DeliveryType, windowStart: string | undefined, recipientName?: string): string {
  const hi = `Hi${recipientName ? ' ' + recipientName.split(' ')[0] : ''}`
  if (deliveryType === 'morning' || deliveryType === 'evening') {
    return `${hi} — you've got a CitySend parcel scheduled for delivery ${windowPhrase(deliveryType, windowStart)}. ` +
      `Your handoff code is ${code} — give it to the driver when they arrive. ${ADVERT}`
  }
  // Express (or unknown → treat as immediate)
  return `${hi} — a CitySend courier is on the way with a parcel for you. ` +
    `Your handoff code is ${code}. Give it to the driver at the door. ${ADVERT}`
}

/** Build a cross-platform sms: deep link. iOS uses `&body=`, others `?body=`. */
function smsHref(phone: string, body: string): string {
  const number = phone.replace(/[^\d+]/g, '')
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const sep = isIOS ? '&' : '?'
  return `sms:${number}${sep}body=${encodeURIComponent(body)}`
}

export function HandoffCodeCard({
  code, recipientPhone, recipientName, deliveryType, windowStart, style,
}: {
  code: string
  recipientPhone?: string
  recipientName?: string
  deliveryType?: DeliveryType
  windowStart?: string
  style?: React.CSSProperties
}) {
  const canText = !!recipientPhone && recipientPhone.replace(/[^\d]/g, '').length >= 7
  const message = buildMessage(code, deliveryType, windowStart, recipientName)

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
