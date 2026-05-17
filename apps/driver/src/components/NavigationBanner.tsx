import React from 'react'

interface Props {
  /** Instruction text (e.g. "Turn left onto Princess St") */
  instruction: string
  /** Distance cue (e.g. "In 250 m") */
  distanceCue?: string
}

/**
 * NavigationBanner — Dark ink navigation card at top of map.
 * Design matches DEnRouteScreen nav banner from driver-screens.jsx prototype.
 * Accent-colored square icon with up-arrow SVG + instruction text.
 */
export function NavigationBanner({ instruction, distanceCue = 'In 250 m' }: Props) {
  return (
    <div style={{
      position: 'absolute', top: 'max(44px, calc(env(safe-area-inset-top, 0px) + 16px))', left: 12, right: 12, zIndex: 5,
      background: '#111827', color: '#fff', borderRadius: 18,
      padding: 14, display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 12px 30px -10px rgba(11,18,32,.5)',
      animation: 'navSlideDown 0.3s ease-out',
    }}>
      {/* Direction icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: '#c94a1b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V8"/>
          <path d="M6 14l6-6 6 6"/>
        </svg>
      </div>
      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,.55)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {distanceCue}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, marginTop: 2 }}>
          {instruction}
        </div>
      </div>
      <style>{`
        @keyframes navSlideDown {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
