import React, { useEffect } from 'react'
import './LandingScreen.css'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
}

const S = {
  wrap: {
    minHeight: '100vh', background: '#fafbfc',
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

export function PrivacyScreen({ go }: Props) {
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
        <span style={{ fontSize: 13, color: '#64748b' }}>Privacy Policy</span>
      </nav>

      <div style={S.content}>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.meta}>Last updated: May 2026 &nbsp;·&nbsp; CitySend Delivery Co., Winnipeg, MB</p>

        <p style={S.p}>
          CitySend Delivery Co. ("CitySend", "we", "our", or "us") operates the citysend.ca
          platform and related mobile applications. This Privacy Policy explains what personal
          information we collect, how we use it, and the choices you have.
        </p>
        <p style={S.p}>
          By using CitySend, you agree to the collection and use of information in accordance
          with this policy. If you do not agree, please do not use the service.
        </p>

        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}><strong>Account information</strong> — When you create an account we collect your name,
          email address, and phone number.</p>
        <p style={S.p}><strong>Delivery information</strong> — To process a delivery we collect pickup and
          drop-off addresses, recipient name and phone number, and any delivery notes you provide.</p>
        <p style={S.p}><strong>Payment information</strong> — Payments are processed by Stripe, Inc. We do not
          store full card numbers on our servers. Stripe provides us with a tokenised reference
          and the last four digits of your card for display purposes.</p>
        <p style={S.p}><strong>Location data (drivers)</strong> — If you use the CitySend Driver app, we collect
          your GPS location during active deliveries to show customers a live map and to calculate
          routes. Location access is only active while a delivery is in progress.</p>
        <p style={S.p}><strong>Usage data</strong> — We collect standard server logs (IP address, browser type,
          pages visited, timestamps) to operate and improve the service.</p>

        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <ul style={S.ul}>
          <li style={S.li}>To match and fulfil delivery requests</li>
          <li style={S.li}>To send order confirmations, delivery updates, and receipts by email</li>
          <li style={S.li}>To process payments and issue refunds</li>
          <li style={S.li}>To show customers live driver location during active deliveries</li>
          <li style={S.li}>To prevent fraud, abuse, and safety incidents</li>
          <li style={S.li}>To improve the platform and diagnose technical issues</li>
          <li style={S.li}>To comply with legal obligations</li>
        </ul>
        <p style={S.p}>We do not sell your personal information to third parties.</p>

        <h2 style={S.h2}>3. Sharing Your Information</h2>
        <p style={S.p}>We share your information only as necessary to operate the service:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Drivers</strong> — receive the pickup address, drop-off address,
            and recipient name for each assigned delivery.</li>
          <li style={S.li}><strong>Stripe, Inc.</strong> — processes all payment transactions.
            Stripe's privacy policy is available at stripe.com/privacy.</li>
          <li style={S.li}><strong>Supabase, Inc.</strong> — provides our authentication and
            database infrastructure. Data is stored on servers in Canada where available.</li>
          <li style={S.li}><strong>Resend, Inc.</strong> — delivers transactional emails such as
            order confirmations and password resets.</li>
          <li style={S.li}><strong>Law enforcement</strong> — we may disclose information if
            required by law or to protect the rights and safety of our users.</li>
        </ul>

        <h2 style={S.h2}>4. Data Retention</h2>
        <p style={S.p}>
          We retain your account information for as long as your account is active. Delivery
          records are retained for a minimum of seven years to comply with applicable tax and
          accounting requirements. You may request deletion of your account at any time (see
          Section 6).
        </p>

        <h2 style={S.h2}>5. Cookies and Tracking</h2>
        <p style={S.p}>
          The CitySend web app uses browser local storage and session storage to maintain your
          login session and delivery preferences. We do not use third-party advertising trackers
          or behavioural analytics.
        </p>

        <h2 style={S.h2}>6. Your Rights</h2>
        <p style={S.p}>You have the right to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Access the personal information we hold about you</li>
          <li style={S.li}>Correct inaccurate or incomplete information</li>
          <li style={S.li}>Request deletion of your account and associated data</li>
          <li style={S.li}>Withdraw consent where processing is based on consent</li>
        </ul>
        <p style={S.p}>
          To exercise any of these rights, email us at{' '}
          <a href="mailto:privacy@citysend.ca" style={{ color: '#c94a1b' }}>privacy@citysend.ca</a>.
          We will respond within 30 days.
        </p>

        <h2 style={S.h2}>7. Security</h2>
        <p style={S.p}>
          We use industry-standard measures to protect your information, including TLS encryption
          in transit, row-level security in our database, and restricted staff access. No method
          of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 style={S.h2}>8. Children</h2>
        <p style={S.p}>
          CitySend is not directed at children under 13 years of age. We do not knowingly collect
          personal information from children under 13. If you believe a child has provided us with
          personal information, please contact us.
        </p>

        <h2 style={S.h2}>9. Changes to This Policy</h2>
        <p style={S.p}>
          We may update this Privacy Policy from time to time. We will notify registered users by
          email when material changes are made and update the "Last updated" date at the top of
          this page.
        </p>

        <h2 style={S.h2}>10. Contact</h2>
        <p style={S.p}>
          CitySend Delivery Co.<br/>
          Winnipeg, Manitoba, Canada<br/>
          <a href="mailto:privacy@citysend.ca" style={{ color: '#c94a1b' }}>privacy@citysend.ca</a>
        </p>
      </div>
    </div>
  )
}
