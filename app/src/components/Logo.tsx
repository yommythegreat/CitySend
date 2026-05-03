import React from 'react'

interface LogoWordmarkProps {
  scale?: number
  color?: string
  accent?: string
}

export function LogoWordmark({ scale = 1, color = 'var(--cs-ink)', accent = 'var(--cs-accent)' }: LogoWordmarkProps) {
  // viewBox is trimmed to the actual content width (~170 units) so that when
  // the element is centered the visual text lands at true centre.
  // The original 240-wide viewBox left ~72 units of dead space on the right,
  // causing an apparent left-offset when justifyContent:'center' was applied.
  return (
    <svg viewBox="0 0 170 52" width={170 * scale} height={52 * scale} style={{ display: 'block' }}>
      <text x="0" y="38" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={color} letterSpacing="-1.4">city</text>
      <text x="89" y="38" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={color} letterSpacing="-1.4">send</text>
      <g transform="translate(77.5, 26)">
        <path d="M0 0 L9 0 M6 -3 L9 0 L6 3" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    </svg>
  )
}

export function LogoPin({ scale = 1, color = 'var(--cs-ink)', fg = '#fff' }: { scale?: number; color?: string; fg?: string }) {
  return (
    <svg viewBox="0 0 60 60" width={60 * scale} height={60 * scale} style={{ display: 'block' }}>
      <path d="M30 4c-10 0-18 7.5-18 17 0 13 18 35 18 35s18-22 18-35c0-9.5-8-17-18-17z" fill={color}/>
      <g transform="translate(19, 16)" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M2 8 L20 8"/>
        <path d="M14 3 L20 8 L14 13"/>
      </g>
    </svg>
  )
}
