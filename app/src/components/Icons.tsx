import React from 'react'

interface IconProps {
  size?: number
  color?: string
  stroke?: number
  fill?: string
}

const I = ({
  d, size = 20, stroke = 1.6, fill = 'none', color = 'currentColor', children,
}: IconProps & { d?: React.ReactNode; children?: React.ReactNode }) => (
  <svg
    width={size} height={size} viewBox="0 0 20 20"
    fill={fill === 'none' ? 'none' : color}
    stroke={color} strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
  >
    {d || children}
  </svg>
)

export const Arrow    = (p: IconProps) => <I {...p}><path d="M4 10h12"/><path d="M11 5l5 5-5 5"/></I>
export const ArrowUp  = (p: IconProps) => <I {...p}><path d="M10 16V4"/><path d="M5 9l5-5 5 5"/></I>
export const Chevron  = (p: IconProps) => <I {...p}><path d="M7 4l6 6-6 6"/></I>
export const ChevronDown = (p: IconProps) => <I {...p}><path d="M4 7l6 6 6-6"/></I>
export const Check    = (p: IconProps) => <I {...p}><path d="M4 10.5l4 4 8-9"/></I>
export const X        = (p: IconProps) => <I {...p}><path d="M5 5l10 10"/><path d="M15 5L5 15"/></I>
export const Plus     = (p: IconProps) => <I {...p}><path d="M10 4v12"/><path d="M4 10h12"/></I>
export const Pin      = (p: IconProps) => <I {...p}><path d="M10 17s-5-5-5-9a5 5 0 0110 0c0 4-5 9-5 9z"/><circle cx="10" cy="8" r="1.8"/></I>
export const Package  = (p: IconProps) => <I {...p}><path d="M10 3L3 6.5v7L10 17l7-3.5v-7L10 3z"/><path d="M3 6.5L10 10l7-3.5"/><path d="M10 10v7"/></I>
export const User     = (p: IconProps) => <I {...p}><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></I>
export const Phone    = (p: IconProps) => <I {...p}><path d="M5 3h3l2 5-2 1a8 8 0 004 4l1-2 5 2v3a2 2 0 01-2 2A13 13 0 013 5a2 2 0 012-2z"/></I>
export const Home     = (p: IconProps) => <I {...p}><path d="M3 9l7-6 7 6v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M8 17v-5h4v5"/></I>
export const Clock    = (p: IconProps) => <I {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></I>
export const Receipt  = (p: IconProps) => <I {...p}><path d="M5 3h10v14l-2.5-2-2.5 2-2.5-2L5 17V3z"/><path d="M8 7h4M8 10h4"/></I>
export const Card     = (p: IconProps) => <I {...p}><rect x="3" y="5" width="14" height="10" rx="2"/><path d="M3 9h14"/></I>
export const Lock     = (p: IconProps) => <I {...p}><rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9V6a3 3 0 016 0v3"/></I>
export const Bell     = (p: IconProps) => <I {...p}><path d="M6 8a4 4 0 018 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M8.5 17a1.5 1.5 0 003 0"/></I>
export const History  = (p: IconProps) => <I {...p}><path d="M3 10a7 7 0 107-7 7 7 0 00-5 2L3 3v4h4"/><path d="M10 6v4l3 2"/></I>
export const Send     = (p: IconProps) => <I {...p}><path d="M17 3L3 9l6 2 2 6 6-14z"/><path d="M9 11l4-4"/></I>
export const Flash    = (p: IconProps) => <I {...p}><path d="M11 2L3 12h5l-1 6 8-10h-5l1-6z"/></I>
export const Shield   = (p: IconProps) => <I {...p}><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3.5-4"/></I>
export const Route    = (p: IconProps) => <I {...p}><circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M5 7v3a3 3 0 003 3h4a3 3 0 013 3"/></I>
export const MapIcon  = (p: IconProps) => <I {...p}><path d="M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2V5z"/><path d="M8 3v14M12 5v14"/></I>
export const Truck    = (p: IconProps) => <I {...p}><path d="M2 6h10v8H2z"/><path d="M12 9h4l2 3v2h-6"/><circle cx="6" cy="15" r="1.5"/><circle cx="14" cy="15" r="1.5"/></I>
export const Repeat   = (p: IconProps) => <I {...p}><path d="M4 7h10l-3-3M16 13H6l3 3"/></I>
export const Star     = (p: IconProps) => <I {...p} fill={p.fill ?? 'none'}><path d="M10 3l2.3 4.7 5.2.7-3.8 3.7.9 5.2L10 14.8l-4.7 2.5.9-5.2L2.4 8.4l5.2-.7L10 3z"/></I>
export const Search   = (p: IconProps) => <I {...p}><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></I>
export const Sparkle  = (p: IconProps) => <I {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4"/><path d="M6 6l2 2M12 12l2 2M14 6l-2 2M8 12l-2 2"/></I>
export const Menu     = (p: IconProps) => <I {...p}><path d="M4 6h12M4 10h12M4 14h12"/></I>
export const Wallet   = (p: IconProps) => <I {...p}><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M14 11h2"/></I>
export const Settings = ({ size = 20, color = 'currentColor', stroke = 1.8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
export const Eye      = (p: IconProps) => <I {...p}><path d="M2 10c0 0 3.5-6 8-6s8 6 8 6-3.5 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></I>
export const EyeOff   = (p: IconProps) => <I {...p}><path d="M2 10c0 0 3.5-6 8-6s8 6 8 6-3.5 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/><path d="M3 3l14 14"/></I>
export const Back     = ({ size = 14, color = 'var(--cs-ink)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ display: 'block' }}>
    <path d="M9 2L4 7l5 5"/>
  </svg>
)
