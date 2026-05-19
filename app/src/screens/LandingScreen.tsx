import React, { useEffect } from 'react'
import './LandingScreen.css'
import type { ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName, opts?: Record<string, unknown>) => void
}

// ── Inline SVG icons (minimal subset needed by landing) ──────────────────────

function IconArrow({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4"/>
    </svg>
  )
}

function IconSend({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z"/>
    </svg>
  )
}

function IconPin({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2C7.24 2 5 4.24 5 7c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z"/>
      <circle cx="10" cy="7" r="2"/>
    </svg>
  )
}

function IconPackage({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6.5l-6-3.5-6 3.5v7l6 3.5 6-3.5v-7z"/>
      <path d="M4 6.5l6 3.5 6-3.5"/>
      <line x1="10" y1="10" x2="10" y2="17"/>
      <path d="M7 5l3 1.75L13 5"/>
    </svg>
  )
}

function IconFlash({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z"/>
    </svg>
  )
}

function IconRoute({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2"/>
      <circle cx="15" cy="15" r="2"/>
      <path d="M7 5h4a4 4 0 0 1 4 4v1"/>
      <path d="M13 15H9a4 4 0 0 1-4-4v-1"/>
    </svg>
  )
}

function IconTag({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6l8 8-6 6-8-8V3z"/>
      <circle cx="7" cy="7" r="1.2" fill={color} stroke="none"/>
    </svg>
  )
}

function IconUser({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6" r="3"/>
      <path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
    </svg>
  )
}

function IconHome({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L10 3l7 6.5"/>
      <path d="M5 8v8h4v-4h2v4h4V8"/>
    </svg>
  )
}

function IconCheck({ color = 'currentColor', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
         stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 7 6 11 12 3"/>
    </svg>
  )
}

function IconPlus({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke={color} strokeWidth="1.75" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14"/>
      <line x1="2" y1="8" x2="14" y2="8"/>
    </svg>
  )
}

// ── Logo wordmark — matches brand.jsx exactly (city→send with kerned arrow) ───

function LogoWordmark({ color = 'var(--cs-ink)', accentColor = 'var(--cs-accent)', scale = 1 }:
  { color?: string; accentColor?: string; scale?: number }) {
  const w = Math.round(240 * scale)
  const h = Math.round(60 * scale)
  return (
    <svg viewBox="0 0 240 60" width={w} height={h} style={{ display: 'block' }}>
      <text x="0" y="42" fontFamily="Geist, system-ui, sans-serif" fontWeight="700"
            fontSize="38" fill={color} letterSpacing="-1.4">city</text>
      <text x="89" y="42" fontFamily="Geist, system-ui, sans-serif" fontWeight="700"
            fontSize="38" fill={color} letterSpacing="-1.4">send</text>
      {/* Kerned arrow glyph between "city" and "send" */}
      <g transform="translate(77.5, 30)">
        <path d="M0 0 L9 0 M6 -3 L9 0 L6 3"
              stroke={accentColor} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    </svg>
  )
}

// ── Hero phone mockup (crafted HTML/SVG illustration) ─────────────────────────

function PhoneMockup() {
  return (
    <div className="lp-phone-shell">
      <div className="lp-phone-screen">
        {/* Status bar */}
        <div style={{
          height: 44, background: 'var(--cs-ink)', display: 'flex',
          alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 20px 8px', flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600,
                         fontFamily: 'var(--cs-font)' }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 14, height: 7, border: '1.5px solid #fff', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '2px 10px 2px 2px',
                            background: '#3fb96b', borderRadius: 1 }}/>
              <div style={{ position: 'absolute', right: -4, top: '50%',
                            transform: 'translateY(-50%)', width: 2, height: 4,
                            background: 'rgba(255,255,255,.6)', borderRadius: 1 }}/>
            </div>
          </div>
        </div>

        {/* Map area */}
        <div style={{ position: 'relative', flex: 1, background: '#e8edf3', height: 210 }}>
          {/* Simplified map grid */}
          <svg width="100%" height="100%" viewBox="0 0 256 210" preserveAspectRatio="xMidYMid slice">
            <rect width="256" height="210" fill="#edf0f5"/>
            <g stroke="#d8dde6" strokeWidth="0.8">
              {[0,32,64,96,128,160,192,224,256].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x + 10} y2="210"/>
              ))}
              {[0,28,56,84,112,140,168,196].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2="256" y2={y + 5}/>
              ))}
            </g>
            {/* Streets */}
            <g stroke="#c8cdd8" strokeWidth="4" fill="none">
              <path d="M0 90 L256 110"/>
              <path d="M70 0 L100 210"/>
              <path d="M180 0 L200 210"/>
            </g>
            {/* Route line */}
            <path d="M90 170 Q 130 130, 170 85"
                  stroke="var(--cs-ink)" strokeWidth="3"
                  fill="none" strokeLinecap="round"/>
            <path d="M90 170 Q 130 130, 170 85"
                  stroke="var(--cs-accent)" strokeWidth="2"
                  fill="none" strokeLinecap="round" strokeDasharray="5 5"/>
            {/* Pickup pin */}
            <circle cx="90" cy="170" r="7" fill="var(--cs-ink)"/>
            <circle cx="90" cy="170" r="3" fill="#fff"/>
            {/* Driver dot (animated) */}
            <circle cx="170" cy="85" r="8" fill="var(--cs-accent)" opacity="0.25">
              <animate attributeName="r" from="6" to="14" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.3" to="0" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="170" cy="85" r="6" fill="var(--cs-accent)"/>
            <circle cx="170" cy="85" r="2.5" fill="#fff"/>
          </svg>

          {/* ETA pill */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--cs-ink)', color: '#fff', borderRadius: 999,
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(11,18,32,.3)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#3fb96b' }}/>
            <span style={{ fontFamily: 'var(--cs-font)', fontSize: 12, fontWeight: 600 }}>
              ETA 9 min
            </span>
          </div>
        </div>

        {/* Bottom card */}
        <div style={{
          background: '#fff', padding: '16px 18px 20px',
          borderTop: '1px solid var(--cs-slate-100)',
        }}>
          {/* Driver row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 19, background: 'var(--cs-slate-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>🧑</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cs-ink)',
                            letterSpacing: -0.2 }}>Tomi O.</div>
              <div style={{ fontSize: 11, color: 'var(--cs-slate-500)',
                            fontFamily: 'var(--cs-mono)', letterSpacing: 0.3 }}>★ 4.96</div>
            </div>
            <div style={{
              background: 'var(--cs-accent)', borderRadius: 999,
              padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#fff',
              fontFamily: 'var(--cs-mono)', letterSpacing: 0.4,
            }}>IN TRANSIT</div>
          </div>
          {/* Route row */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '10px 12px', background: 'var(--cs-paper)', borderRadius: 12,
            border: '1px solid var(--cs-slate-100)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 3, paddingTop: 2, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--cs-ink)', border: '2px solid var(--cs-ink)' }}/>
              <div style={{ width: 1, height: 16, background: 'var(--cs-slate-300)' }}/>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--cs-accent)' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)',
                            letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>From</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--cs-ink)', marginBottom: 8 }}>
                134 Princess St
              </div>
              <div style={{ fontSize: 11, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)',
                            letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>To</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--cs-ink)' }}>
                245 Osborne St
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Floating receipt card ─────────────────────────────────────────────────────

function ReceiptCard({ rotate = -4, style }: { rotate?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      transform: `rotate(${rotate}deg)`,
      width: 200,
      background: '#fff',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 24px 50px -20px rgba(11,18,32,.25), 0 4px 12px rgba(11,18,32,.06)',
      border: '1px solid var(--cs-slate-100)',
      fontFamily: 'var(--cs-font)',
      ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10 }}>
        <span style={{
          background: 'rgba(22,107,58,.1)', color: 'var(--cs-ok)',
          borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <IconCheck color="var(--cs-ok)" size={11}/>
          Delivered
        </span>
        <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)' }}>
          CS—2810
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>
        Princess St → Osborne
      </div>
      <div style={{ fontSize: 11, color: 'var(--cs-slate-500)', marginTop: 2 }}>
        Mei T. · 1:22 PM
      </div>
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--cs-slate-200)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-700)',
      }}>
        <span>Total</span>
        <span>$15.68</span>
      </div>
    </div>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ n, title, body, icon, accent }:
  { n: string; title: string; body: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="lp-step-card">
      <div style={{
        position: 'absolute', top: -28, right: -16, fontSize: 130, fontWeight: 700,
        color: 'var(--cs-slate-100)', fontFamily: 'var(--cs-font)', letterSpacing: -6,
        lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
      }}>{n}</div>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: accent ? 'var(--cs-accent)' : 'var(--cs-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {React.cloneElement(icon as React.ReactElement, { color: '#fff', size: 22 })}
      </div>
      <div style={{ marginTop: 22, position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
          letterSpacing: 1.6, textTransform: 'uppercase', display: 'inline-flex',
          alignItems: 'center', gap: 8,
        }}>Step {n}</div>
        <div style={{
          fontSize: 22, fontWeight: 600, letterSpacing: -0.5,
          color: 'var(--cs-ink)', marginTop: 10,
        }}>{title}</div>
        <div style={{
          fontSize: 14, color: 'var(--cs-slate-700)', lineHeight: 1.5, marginTop: 8,
        }}>{body}</div>
      </div>
    </div>
  )
}

// ── Trust card ────────────────────────────────────────────────────────────────

function TrustCard({ title, body, icon, dark }:
  { title: string; body: string; icon: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{
      background: dark ? 'var(--cs-ink)' : '#fff',
      color: dark ? '#fff' : 'var(--cs-ink)',
      borderRadius: 22, padding: 26,
      border: dark ? 'none' : '1px solid var(--cs-slate-100)',
      display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: dark ? 'rgba(255,255,255,.1)' : 'var(--cs-paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {React.cloneElement(icon as React.ReactElement,
          { color: dark ? '#fff' : 'var(--cs-ink)', size: 20 })}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>{title}</div>
        <div style={{
          fontSize: 13.5, lineHeight: 1.5, marginTop: 6,
          color: dark ? 'rgba(255,255,255,.7)' : 'var(--cs-slate-700)',
        }}>{body}</div>
      </div>
    </div>
  )
}

// ── Place chip ────────────────────────────────────────────────────────────────

function PlaceChip({ label, addr, icon, action }:
  { label: string; addr: string; icon: React.ReactNode; action?: boolean }) {
  return (
    <div style={{
      background: action ? 'var(--cs-paper)' : '#fff',
      borderRadius: 18, padding: 18,
      border: '1px solid var(--cs-slate-100)',
      display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 180, flex: '1 1 180px',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: action ? 'var(--cs-slate-100)' : 'var(--cs-paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: action ? 'var(--cs-slate-500)' : 'var(--cs-ink)',
        flexShrink: 0,
      }}>
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.2,
        }}>{label}</div>
        <div style={{
          fontSize: 12, color: 'var(--cs-slate-500)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{addr}</div>
      </div>
      <IconPlus size={16} color="var(--cs-slate-400)"/>
    </div>
  )
}

// ── Winnipeg map illustration ─────────────────────────────────────────────────

function WinnipegMap() {
  return (
    <div style={{
      position: 'relative', aspectRatio: '5/4', background: '#fff', borderRadius: 28,
      border: '1px solid var(--cs-slate-100)', overflow: 'hidden',
      boxShadow: '0 30px 60px -30px rgba(11,18,32,.2)',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice">
        <rect width="600" height="480" fill="#f7f8fb"/>
        {/* River */}
        <path d="M-20 140 C 120 200, 200 180, 260 250 S 320 380, 280 480 L -20 480 Z" fill="#dde5ef"/>
        <path d="M260 250 C 320 240, 400 220, 480 280 S 600 340, 620 320 L 620 -20 L 280 -20 Z" fill="#f7f8fb"/>
        <path d="M260 250 C 320 260, 380 280, 420 360 S 460 460, 480 480 L 620 480 L 620 320 C 600 340, 480 280, 420 240 Z" fill="#dde5ef"/>
        {/* Grid streets */}
        <g stroke="#dde2ea" strokeWidth="1">
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40 - 30} y1="0" x2={i * 40 + 80} y2="480"/>
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="600" y2={i * 40 + 30}/>
          ))}
        </g>
        {/* Major roads */}
        <g stroke="#c8d0db" strokeWidth="5" fill="none">
          <path d="M-20 200 L620 280"/>
          <path d="M-20 360 L620 400"/>
          <path d="M120 -20 L220 500"/>
          <path d="M380 -20 L450 500"/>
        </g>
        {/* City pins */}
        {([
          { x: 180, y: 180, l: 'Exchange', accent: true },
          { x: 320, y: 290, l: 'Osborne' },
          { x: 460, y: 200, l: 'Polo Park' },
          { x: 240, y: 380, l: 'River Heights' },
          { x: 470, y: 360, l: 'St. Vital' },
          { x: 380, y: 130, l: 'North End' },
        ] as { x: number; y: number; l: string; accent?: boolean }[]).map((p) => (
          <g key={p.l} transform={`translate(${p.x}, ${p.y})`}>
            {p.accent && (
              <>
                <circle r="22" fill="rgba(201,74,27,.15)">
                  <animate attributeName="r" from="18" to="32" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite"/>
                </circle>
              </>
            )}
            <circle r="9" fill="#fff" stroke={p.accent ? 'var(--cs-accent)' : 'var(--cs-ink)'} strokeWidth="2.5"/>
            <circle r="4" fill={p.accent ? 'var(--cs-accent)' : 'var(--cs-ink)'}/>
            <text x="14" y="4" fontFamily="Geist Mono, monospace" fontSize="10" fontWeight="500"
                  fill="var(--cs-ink)" letterSpacing="0.6">{p.l.toUpperCase()}</text>
          </g>
        ))}
        {/* Active route */}
        <path d="M180 180 Q 250 230, 320 290" stroke="var(--cs-ink)" strokeWidth="3"
              fill="none" strokeLinecap="round"/>
        <path d="M180 180 Q 250 230, 320 290" stroke="var(--cs-accent)" strokeWidth="2"
              fill="none" strokeLinecap="round" strokeDasharray="6 6"/>
      </svg>
      <div style={{
        position: 'absolute', top: 18, left: 18, padding: '8px 12px',
        background: 'var(--cs-ink)', color: '#fff', borderRadius: 999,
        fontFamily: 'var(--cs-mono)', fontSize: 11, letterSpacing: 1,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: '#3fb96b' }}/>
        42 ACTIVE DELIVERIES
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

type FooterLink =
  | { label: string; href: string }
  | { label: string; action: () => void }

function Footer({ go }: { go: (screen: ScreenName) => void }) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const cols: { h: string; l: FooterLink[] }[] = [
    {
      h: 'Product',
      l: [
        { label: 'Send a package', action: () => go('auth') },
        { label: 'Track',          action: () => go('auth') },
        { label: 'Pricing',        action: () => scrollTo('pricing') },
      ],
    },
    {
      h: 'Company',
      l: [
        { label: 'About',        action: () => go('about') },
        { label: 'Drive with us', href: 'https://driver.citysend.ca' },
      ],
    },
    {
      h: 'Help',
      l: [
        { label: 'Support', href: 'mailto:support@citysend.ca' },
        { label: 'Privacy', action: () => go('privacy') },
        { label: 'Terms',   action: () => go('terms')   },
      ],
    },
  ]

  const socials = [
    { label: 'IG', href: 'https://instagram.com/citysend.ca' },
    { label: 'X',  href: 'https://x.com/citysend_ca' },
  ]

  const linkStyle: React.CSSProperties = {
    fontSize: 14, color: 'rgba(255,255,255,.78)', textDecoration: 'none',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--cs-font)', padding: 0, textAlign: 'left',
  }

  return (
    <footer className="lp-footer">
      <div className="lp-footer-grid">
        <div>
          <LogoWordmark color="#fff" accentColor="var(--cs-accent-2)" scale={0.9}/>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 16,
            lineHeight: 1.5, maxWidth: 280,
          }}>
            Same-day delivery for Winnipeg.<br/>Across town, before dawn.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                width: 36, height: 36, borderRadius: 18,
                background: 'rgba(255,255,255,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--cs-mono)', fontSize: 11, fontWeight: 500,
                letterSpacing: 0.5, color: '#fff', textDecoration: 'none',
              }}>{s.label}</a>
            ))}
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.h}>
            <div style={{
              fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'rgba(255,255,255,.45)',
              letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14,
            }}>{c.h}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.l.map((item) =>
                'href' in item ? (
                  <a key={item.label} href={item.href}
                     target={item.href.startsWith('mailto') ? undefined : '_blank'}
                     rel="noopener noreferrer"
                     style={linkStyle}>{item.label}</a>
                ) : (
                  <button key={item.label} onClick={item.action}
                          style={linkStyle}>{item.label}</button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="lp-footer-bottom">
        <div>© 2026 CITYSEND DELIVERY CO · WPG · MB · CA</div>
        <div>v1.0 · BUILT IN WINNIPEG</div>
      </div>
    </footer>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────

export function LandingScreen({ go }: Props) {
  // Body class for full-viewport styling (overrides the app's tan shell bg)
  useEffect(() => {
    document.body.classList.add('cs-landing')
    return () => document.body.classList.remove('cs-landing')
  }, [])

  // Both CTAs navigate to auth — user signs in/up, then lands on home to start a delivery
  const handleSend = () => go('auth')
  const handleAuth = () => go('auth')

  return (
    <div className="lp-wrap">

      {/* ─── Nav ──────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <LogoWordmark scale={0.65}/>
        <div className="lp-nav-links">
          <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) }}>How it works</a>
          <a href="#" onClick={(e) => { e.preventDefault(); go('auth') }}>Track delivery</a>
          <a href="mailto:support@citysend.ca">Support</a>
        </div>
        <div className="lp-nav-right">
          <button className="lp-nav-login" onClick={handleAuth}>Log in</button>
          <button className="lp-nav-cta" onClick={handleSend}>
            Send a package
            <IconArrow color="#fff" size={13}/>
          </button>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="lp-section-hero">
        {/* Glow */}
        <div style={{
          position: 'absolute', top: -200, right: -120, width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(231,106,58,.15), transparent 60%)',
          pointerEvents: 'none',
        }}/>

        <div className="lp-hero-grid">
          {/* Copy */}
          <div>
            <div className="lp-eyebrow" style={{ color: 'var(--cs-accent)' }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: 3,
                background: 'var(--cs-accent)',
              }}/>
              Now live in Winnipeg
            </div>
            <h1 style={{
              fontSize: 'clamp(52px, 6vw, 88px)',
              fontWeight: 600, letterSpacing: 'clamp(-2px, -0.04em, -3.5px)',
              lineHeight: 0.96, margin: '20px 0 0', textWrap: 'balance',
              color: 'var(--cs-ink)',
            }}>
              Across town,<br/>
              <span style={{ color: 'var(--cs-accent)' }}>before dawn.</span>
            </h1>
            <p style={{
              fontSize: 'clamp(16px, 1.4vw, 20px)', lineHeight: 1.5,
              color: 'var(--cs-slate-700)', marginTop: 24, maxWidth: 520,
              fontWeight: 400,
            }}>
              Same-day delivery for anything that fits in a car — documents, keys, cakes,
              laptops. Flat <strong style={{ color: 'var(--cs-ink)' }}>$15</strong>, picked
              up in about 30 minutes, tracked the whole way.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={handleSend} style={{
                height: 52, padding: '0 24px', background: 'var(--cs-ink)', color: '#fff',
                border: 'none', borderRadius: 999, fontFamily: 'var(--cs-font)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: -0.2,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 20px -8px rgba(11,18,32,.45)',
              }}>
                <IconSend color="#fff" size={16}/>
                Send a package
              </button>
              <button onClick={handleAuth} style={{
                height: 52, padding: '0 24px',
                background: 'transparent', color: 'var(--cs-ink)',
                border: '1.5px solid var(--cs-slate-200)', borderRadius: 999,
                fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', letterSpacing: -0.2,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                Track a delivery
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
              {([
                ['30 min', 'avg pickup'],
                ['98.4%', 'on-time'],
                ['$15',   'flat across WPG'],
              ] as [string, string][]).map(([n, k]) => (
                <div key={k}>
                  <div style={{
                    fontSize: 22, fontWeight: 600, color: 'var(--cs-ink)',
                    letterSpacing: -0.6,
                  }}>{n}</div>
                  <div style={{
                    fontFamily: 'var(--cs-mono)', fontSize: 11, letterSpacing: 1,
                    textTransform: 'uppercase', marginTop: 3, color: 'var(--cs-slate-500)',
                  }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone illustration */}
          <div className="lp-hero-mockup">
            {/* Terracotta accent blob */}
            <div style={{
              position: 'absolute', top: 40, left: -10, width: 160, height: 160,
              borderRadius: 24, background: 'linear-gradient(135deg, var(--cs-accent), var(--cs-accent-2))',
              transform: 'rotate(-8deg)', opacity: 0.92,
              boxShadow: '0 30px 60px -20px rgba(201,74,27,.4)',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', padding: 18, color: '#fff',
              zIndex: 1,
            }}>
              <IconFlash color="#fff" size={26}/>
              <div>
                <div style={{
                  fontFamily: 'var(--cs-mono)', fontSize: 10, letterSpacing: 1.4,
                  textTransform: 'uppercase', opacity: 0.8,
                }}>Live</div>
                <div style={{
                  fontSize: 28, fontWeight: 600, letterSpacing: -1,
                  lineHeight: 1.05, marginTop: 4,
                }}>ETA<br/>9 min</div>
              </div>
            </div>

            <PhoneMockup/>

            <ReceiptCard rotate={6} style={{ bottom: 30, right: -20 }}/>
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="lp-section-how">
        <div className="lp-eyebrow" style={{ color: 'var(--cs-slate-500)' }}>How it works</div>
        <div className="lp-section-title">Three taps. Thirty minutes. Done.</div>
        <div className="lp-section-sub" style={{ maxWidth: 620 }}>
          No quotes, no calls, no waiting on a hub. Tell us where, snap a photo,
          hand it to the courier at your door.
        </div>

        <div className="lp-steps">
          <StepCard n="01" title="Tell us where" icon={<IconPin/>}
            body="Two addresses, a name, a phone. We predict the rest. Saved places remember themselves."/>
          <StepCard n="02" title="Add the package" icon={<IconPackage/>} accent
            body="Pick a size, write what's inside. Mark it fragile if it is. We're carrying it like it's ours."/>
          <StepCard n="03" title="We handle the rest" icon={<IconSend/>}
            body="Match a courier, pick it up in ~30 min, track the route live. Receipt in your email when it lands."/>
        </div>
      </section>

      {/* ─── Live tracking ────────────────────────────────────────────── */}
      <section className="lp-section-tracking">
        {/* Subtle glow */}
        <div style={{
          position: 'absolute', top: -80, right: -40, width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(231,106,58,.18), transparent 60%)',
          pointerEvents: 'none',
        }}/>

        <div className="lp-tracking-grid">
          <div>
            <div className="lp-eyebrow" style={{ color: 'rgba(255,255,255,.5)' }}>
              Live tracking
            </div>
            <div style={{
              fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 600,
              letterSpacing: -2, lineHeight: 1.02, marginTop: 16, color: '#fff',
            }}>
              Watch it move.<br/>Message the driver.<br/>
              <span style={{ color: 'var(--cs-accent-2)' }}>You'll know when it lands.</span>
            </div>
            <div style={{
              fontSize: 17, lineHeight: 1.55, color: 'rgba(255,255,255,.7)',
              marginTop: 22, maxWidth: 480,
            }}>
              The map updates every few seconds. The ETA is honest. If something
              changes, you'll know before the recipient does.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
              {([
                ['Matched',  'Tomi O. · 4.96★'],
                ['Picked up','134 Princess St · 1:08 PM'],
                ['Arriving', '2 blocks from Osborne St · ETA 2 min'],
              ] as [string, string][]).map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                    background: i === 2 ? 'var(--cs-accent)' : 'rgba(255,255,255,.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i === 2
                      ? <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }}/>
                      : <IconCheck color="#fff" size={14}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--cs-mono)', fontSize: 11,
                      color: 'rgba(255,255,255,.55)', letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    }}>{k}</div>
                    <div style={{ fontSize: 15, color: '#fff', marginTop: 2 }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone on dark — hidden on narrow screens via CSS */}
          <div className="lp-phone-col" style={{
            display: 'flex', justifyContent: 'center',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,.4))',
          }}>
            <div style={{ transform: 'scale(0.85)' }}>
              <PhoneMockup/>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Saved places ─────────────────────────────────────────────── */}
      <section className="lp-section-places">
        <div className="lp-eyebrow" style={{ color: 'var(--cs-slate-500)' }}>Saved places</div>
        <div className="lp-section-title">Your favourite stops,<br/>always one tap away.</div>
        <div className="lp-section-sub" style={{ maxWidth: 580 }}>
          Home, the studio, mom's. Add a place once and it shows up everywhere —
          autofill on send, suggestions on receive.
        </div>

        <div className="lp-places-row">
          <PlaceChip icon={<IconHome/>}    label="Home"       addr="134 Princess St"/>
          <PlaceChip icon={<IconPackage/>} label="Studio"     addr="245 McDermot Ave #301"/>
          <PlaceChip icon={<IconPin/>}     label="Mom's"      addr="1220 Grosvenor Ave"/>
          <PlaceChip icon={<IconUser/>}    label="Dad's office" addr="201 Portage Ave"/>
          <PlaceChip icon={<IconPlus/>}    label="Add a place"  addr="Saves to your account" action/>
        </div>
      </section>

      {/* ─── Trust grid ───────────────────────────────────────────────── */}
      <section id="pricing" className="lp-section-trust">
        <div style={{ maxWidth: 720, marginInline: 'auto', textAlign: 'center' }}>
          <div className="lp-eyebrow" style={{ color: 'var(--cs-slate-500)', justifyContent: 'center' }}>
            Why CitySend
          </div>
          <div className="lp-section-title">The boring stuff, done well.</div>
        </div>

        <div className="lp-trust-grid">
          <TrustCard dark icon={<IconFlash/>} title="Same-day, every time"
            body="Pickup in ~30 min. Delivered before the day ends. If we miss, the ride's on us."/>
          <TrustCard icon={<IconRoute/>} title="Real-time tracking"
            body="Live map, honest ETAs, and a thread to message the driver if you need to."/>
          <TrustCard icon={<IconTag/>} title="Flat $15. No surprises."
            body="Same price whether you're in the Exchange or Transcona. No surge, no zones, no hidden fees."/>
          <TrustCard icon={<IconUser/>} title="Local drivers"
            body="Couriers vetted in Winnipeg, paid fairly, rated by the people they deliver to."/>
        </div>
      </section>

      {/* ─── CTA strip ────────────────────────────────────────────────── */}
      <section className="lp-section-cta">
        <div className="lp-cta-card">
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: -100, right: -60, width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(231,106,58,.3), transparent 60%)',
            pointerEvents: 'none',
          }}/>
          <div style={{ position: 'relative', maxWidth: 560 }}>
            <div style={{
              fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 600,
              letterSpacing: -1.6, lineHeight: 1.05,
            }}>
              Got something that needs to be there today?
            </div>
            <div style={{ fontSize: 17, color: 'rgba(255,255,255,.7)', marginTop: 14 }}>
              No account needed to send your first one.
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={handleSend} style={{
              height: 56, padding: '0 28px',
              background: 'var(--cs-accent)', color: '#fff', border: 'none',
              borderRadius: 28, fontFamily: 'var(--cs-font)',
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 10,
              boxShadow: '0 12px 24px -8px rgba(201,74,27,.5)',
            }}>
              Send a package
              <IconArrow color="#fff" size={16}/>
            </button>
          </div>
        </div>
      </section>

      <Footer go={go}/>
    </div>
  )
}
