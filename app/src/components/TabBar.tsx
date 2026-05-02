import React from 'react'
import { Home, History, Bell } from './Icons'
import type { ScreenName } from '../types'

interface TabBarProps {
  screen: ScreenName
  go: (screen: ScreenName) => void
}

const TABS: { k: ScreenName; l: string; Icon: React.FC<{ size?: number }> }[] = [
  { k: 'home',          l: 'Home',   Icon: Home },
  { k: 'history',       l: 'History',Icon: History },
  { k: 'notifications', l: 'Alerts', Icon: Bell },
]

export function TabBar({ screen, go }: TabBarProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--cs-ink)',
      borderRadius: 28,
      padding: 6,
      display: 'flex',
      gap: 4,
      zIndex: 50,
      boxShadow: '0 20px 40px -10px rgba(11,18,32,.35)',
    }}>
      {TABS.map((t) => {
        const active = screen === t.k
        return (
          <button
            key={t.k}
            onClick={() => go(t.k)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: active ? '12px 18px' : '12px 14px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 22,
              background: active ? 'var(--cs-accent)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,.55)',
              fontFamily: 'var(--cs-font)',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all .18s',
              whiteSpace: 'nowrap',
            }}
          >
            <t.Icon size={17} />
            {active && <span>{t.l}</span>}
          </button>
        )
      })}
    </div>
  )
}
