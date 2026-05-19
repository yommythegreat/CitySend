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
}

function BackButton({ go }: { go: (screen: ScreenName) => void }) {
  return (
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
  )
}

export function AboutScreen({ go }: Props) {
  useEffect(() => {
    document.body.classList.add('cs-landing')
    window.scrollTo(0, 0)
    return () => document.body.classList.remove('cs-landing')
  }, [])

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <BackButton go={go}/>
        <span style={{ fontSize: 13, color: '#64748b' }}>About</span>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        background: '#0b1220', color: '#fff',
        padding: 'clamp(60px, 8vw, 120px) clamp(24px, 6vw, 80px)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#c94a1b', marginBottom: 24,
          }}>
            Built in Winnipeg
          </div>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700,
            letterSpacing: 'clamp(-1.5px, -0.04em, -3px)',
            lineHeight: 1.0, margin: '0 0 28px',
          }}>
            Delivery that actually<br/>
            <span style={{ color: '#c94a1b' }}>delivers.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 1.4vw, 20px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,.7)', maxWidth: 580, margin: 0,
          }}>
            CitySend is a same-day delivery platform built for Canadian cities. We saw how
            frustrating local deliveries could be — long wait times, unclear pricing, and
            unreliable communication — and we built CitySend to simplify the experience.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(48px, 6vw, 80px) clamp(24px, 6vw, 80px)' }}>

        {/* The problem we're solving */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#94a3b8', marginBottom: 16,
          }}>The problem</div>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 20px', lineHeight: 1.1 }}>
            Our cities move fast.<br/>Delivery didn't.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: '0 0 16px' }}>
            You need a key at a friend's house across the city. A birthday cake at the office.
            A document signed and back before dawn. The tools to do this have been either
            expensive couriers with minimum bookings, or ride-sharing apps that weren't built
            specifically for this purpose.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: 0 }}>
            CitySend was built to close that gap — flat pricing, a real solution, and drivers
            who know the neighbourhood.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e8eaee', marginBottom: 64 }}/>

        {/* How it works */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#94a3b8', marginBottom: 16,
          }}>How we work</div>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 20px', lineHeight: 1.1 }}>
            Simple by design.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: '0 0 16px' }}>
            Customers book a delivery in under two minutes — two addresses, a parcel description,
            done. A nearby driver is matched and en route to pick up in about 30 minutes.
            The whole journey is tracked live. The recipient gets a notification when it
            arrives. A receipt lands in the sender's email. No calls, no wait-for-quote,
            no wondering.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: 0 }}>
            The price is flat. <strong style={{ color: '#0b1220' }}>$15</strong> gets your parcel
            from anywhere in Winnipeg to anywhere else, same day. No surge pricing,
            no zone premiums, no hidden fees at checkout.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e8eaee', marginBottom: 64 }}/>

        {/* Drivers */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#94a3b8', marginBottom: 16,
          }}>Our drivers</div>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 20px', lineHeight: 1.1 }}>
            Local people, paid fairly.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: '0 0 16px' }}>
            Every driver on CitySend is vetted, rated, and a member of our dear city. They set
            their own schedules and keep the majority of every delivery fee. We believe the
            people who do the work should benefit from the platform — not just fund it.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: '0 0 24px' }}>
            Drivers are rated after every delivery. Consistently high ratings earn priority
            job matching. The courier you see on your tracking map is a real person in
            your neighbourhood — not a warehouse robot two cities away.
          </p>
          <a href="https://driver.citysend.ca" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 48, padding: '0 22px',
            background: '#0b1220', color: '#fff', borderRadius: 999,
            fontSize: 14, fontWeight: 600, textDecoration: 'none', letterSpacing: -0.2,
          }}>
            Drive with CitySend
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h10M8 3l4 4-4 4"/>
            </svg>
          </a>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e8eaee', marginBottom: 64 }}/>

        {/* Where we are */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#94a3b8', marginBottom: 16,
          }}>Coverage</div>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 20px', lineHeight: 1.1 }}>
            Winnipeg first. More cities next.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: '0 0 16px' }}>
            We launched in Winnipeg because this is where we're from. We know the river
            splits the city. We know the streets aren't on a perfect grid. We know
            Exchange District traffic at 4:30 PM. That local knowledge is part of
            how CitySend works.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: 0 }}>
            Calgary and Saskatoon are next. If your city isn't on the list yet, you
            can register your interest at citysend.ca and we'll let you know when we arrive.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e8eaee', marginBottom: 64 }}/>

        {/* Contact */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
            color: '#94a3b8', marginBottom: 16,
          }}>Get in touch</div>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: -1, color: '#0b1220', margin: '0 0 20px', lineHeight: 1.1 }}>
            We actually read our email.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'General',  email: 'info@citysend.ca' },
              { label: 'Support',  email: 'support@citysend.ca' },
            ].map(({ label, email }) => (
              <a key={email} href={`mailto:${email}`} style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '16px 20px', borderRadius: 14,
                border: '1px solid #e8eaee', background: '#fff',
                textDecoration: 'none', minWidth: 180,
              }}>
                <span style={{
                  fontFamily: "'Geist Mono', ui-monospace, monospace",
                  fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
                  color: '#94a3b8',
                }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#c94a1b' }}>{email}</span>
              </a>
            ))}
          </div>
        </div>

      </div>

      {/* ── Footer strip ── */}
      <div style={{
        borderTop: '1px solid #e8eaee', padding: '28px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          © 2026 CitySend Delivery Co. · Winnipeg, MB
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Privacy', screen: 'privacy' as ScreenName },
            { label: 'Terms',   screen: 'terms'   as ScreenName },
          ].map(({ label, screen }) => (
            <button key={label} onClick={() => go(screen)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 12, color: '#94a3b8', fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
