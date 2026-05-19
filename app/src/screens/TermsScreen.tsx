import React, { useEffect } from 'react'
import './LandingScreen.css'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
}

const S = {
  wrap: {
    width: '100%', minHeight: '100vh', background: '#fafbfc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  } as React.CSSProperties,
  nav: {
    position: 'sticky' as const, top: 0, zIndex: 10,
    background: 'rgba(250,251,252,.92)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e8eaee',
    padding: '0 32px', height: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  content: {
    maxWidth: 720, margin: '0 auto', padding: '60px 32px 100px',
  },
  h1: {
    fontSize: 36, fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 8px',
  },
  meta: {
    fontSize: 13, color: '#64748b', marginBottom: 48,
  },
  h2: {
    fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: '#0b1220',
    margin: '40px 0 12px',
  },
  p: {
    fontSize: 15, lineHeight: 1.7, color: '#334155', margin: '0 0 16px',
  },
  ul: {
    paddingLeft: 20, margin: '0 0 16px',
  },
  li: {
    fontSize: 15, lineHeight: 1.7, color: '#334155', marginBottom: 6,
  },
}

export function TermsScreen({ go }: Props) {
  useEffect(() => {
    document.body.classList.add('cs-landing')
    window.scrollTo(0, 0)
    return () => document.body.classList.remove('cs-landing')
  }, [])

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <button onClick={() => go('landing')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, fontWeight: 600, color: '#0b1220',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4"/>
          </svg>
          CitySend
        </button>
        <span style={{ fontSize: 13, color: '#64748b' }}>Terms of Service</span>
      </nav>

      <div style={S.content}>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.meta}>Last updated: May 2026 &nbsp;·&nbsp; CitySend Delivery Co., Winnipeg, MB</p>

        <p style={S.p}>
          These Terms of Service ("Terms") govern your use of the CitySend platform, including
          the website at citysend.ca and associated mobile applications, operated by CitySend
          Delivery Co. ("CitySend", "we", "our", or "us"). By using CitySend you agree to
          these Terms. If you do not agree, do not use the service.
        </p>

        <h2 style={S.h2}>1. The Service</h2>
        <p style={S.p}>
          CitySend is a same-day local delivery platform that connects customers who need items
          delivered with independent courier drivers. CitySend acts as a technology intermediary
          and is not itself a courier service. Deliveries are carried out by independent
          contractors who are not employees of CitySend.
        </p>

        <h2 style={S.h2}>2. Eligibility</h2>
        <p style={S.p}>
          You must be at least 18 years old to create an account or place a delivery order.
          By using CitySend you represent that you meet this requirement.
        </p>

        <h2 style={S.h2}>3. Accounts</h2>
        <p style={S.p}>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activity that occurs under your account. Notify us immediately at{' '}
          <a href="mailto:support@citysend.ca" style={{ color: '#c94a1b' }}>support@citysend.ca</a>{' '}
          if you suspect unauthorised access.
        </p>

        <h2 style={S.h2}>4. Placing a Delivery Order</h2>
        <ul style={S.ul}>
          <li style={S.li}>You must provide accurate pickup and drop-off information.</li>
          <li style={S.li}>You are responsible for ensuring the item is lawful to transport
            and does not exceed the size or weight limits specified in the app.</li>
          <li style={S.li}>CitySend reserves the right to refuse or cancel any order at its
            discretion, including orders involving prohibited items.</li>
          <li style={S.li}>Prohibited items include but are not limited to: weapons, illegal
            substances, hazardous materials, animals, and perishable food items not declared
            as such at booking.</li>
        </ul>

        <h2 style={S.h2}>5. Pricing and Payment</h2>
        <p style={S.p}>
          Delivery fees are displayed before you confirm an order. Payment is charged at the
          time of order confirmation. All prices are in Canadian dollars (CAD) and include
          applicable taxes.
        </p>
        <p style={S.p}>
          Tips are optional and paid directly to the driver. CitySend does not take a portion
          of driver tips.
        </p>
        <p style={S.p}>
          Payments are processed by Stripe, Inc. By providing payment information you agree
          to Stripe's terms of service.
        </p>

        <h2 style={S.h2}>6. Cancellations and Refunds</h2>
        <p style={S.p}>
          You may cancel an order without charge before a driver has been matched. Once a
          driver is en route to pick up your item, a cancellation fee of up to the full
          delivery price may apply.
        </p>
        <p style={S.p}>
          If a delivery is not completed due to circumstances within our control, we will
          issue a full refund. Refund requests must be submitted within 7 days of the
          delivery date by emailing{' '}
          <a href="mailto:support@citysend.ca" style={{ color: '#c94a1b' }}>support@citysend.ca</a>.
        </p>

        <h2 style={S.h2}>7. Driver Terms</h2>
        <p style={S.p}>
          Drivers who use the CitySend Driver app are independent contractors, not employees.
          Drivers are responsible for maintaining valid vehicle registration, insurance, and
          any required permits to operate as a courier in Manitoba. CitySend is not liable for
          the acts or omissions of independent drivers.
        </p>

        <h2 style={S.h2}>8. Liability</h2>
        <p style={S.p}>
          CitySend's liability for any lost, damaged, or delayed delivery is limited to the
          lesser of (a) the declared value of the item or (b) $100 CAD per delivery, unless
          a higher declared value is agreed in writing before the delivery.
        </p>
        <p style={S.p}>
          To the maximum extent permitted by applicable law, CitySend is not liable for any
          indirect, incidental, or consequential damages arising from the use of the service.
        </p>

        <h2 style={S.h2}>9. Acceptable Use</h2>
        <p style={S.p}>You agree not to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Use CitySend for any unlawful purpose</li>
          <li style={S.li}>Place fraudulent or fictitious orders</li>
          <li style={S.li}>Harass, threaten, or abuse drivers or CitySend staff</li>
          <li style={S.li}>Attempt to reverse-engineer or scrape the platform</li>
          <li style={S.li}>Use CitySend to deliver items on behalf of third parties for
            commercial gain without our prior written consent</li>
        </ul>

        <h2 style={S.h2}>10. Intellectual Property</h2>
        <p style={S.p}>
          All content on the CitySend platform — including the logo, design, copy, and
          software — is the property of CitySend Delivery Co. and may not be reproduced or
          used without written permission.
        </p>

        <h2 style={S.h2}>11. Modifications to the Service</h2>
        <p style={S.p}>
          We reserve the right to modify or discontinue the service at any time. We will
          provide reasonable notice of material changes where possible.
        </p>

        <h2 style={S.h2}>12. Governing Law</h2>
        <p style={S.p}>
          These Terms are governed by the laws of the Province of Manitoba and the federal
          laws of Canada applicable therein. Any disputes shall be resolved in the courts of
          Winnipeg, Manitoba.
        </p>

        <h2 style={S.h2}>13. Changes to These Terms</h2>
        <p style={S.p}>
          We may update these Terms from time to time. Continued use of CitySend after
          changes are posted constitutes acceptance of the revised Terms. We will notify
          registered users by email when material changes are made.
        </p>

        <h2 style={S.h2}>14. Contact</h2>
        <p style={S.p}>
          CitySend Delivery Co.<br/>
          Winnipeg, Manitoba, Canada<br/>
          <a href="mailto:info@citysend.ca" style={{ color: '#c94a1b' }}>info@citysend.ca</a>
        </p>
      </div>
    </div>
  )
}
