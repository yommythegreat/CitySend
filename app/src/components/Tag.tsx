import React, { ReactNode } from 'react'

type TagTone = 'neutral' | 'ink' | 'accent' | 'ok' | 'warn'

interface TagProps {
  children: ReactNode
  tone?: TagTone
  icon?: ReactNode
}

const TONES: Record<TagTone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--cs-slate-100)', fg: 'var(--cs-slate-700)' },
  ink:     { bg: 'var(--cs-ink)',       fg: '#fff' },
  accent:  { bg: 'rgba(201,74,27,.1)', fg: 'var(--cs-accent)' },
  ok:      { bg: 'rgba(22,107,58,.1)', fg: 'var(--cs-ok)' },
  warn:    { bg: 'rgba(168,92,0,.1)',  fg: 'var(--cs-warn)' },
}

export function Tag({ children, tone = 'neutral', icon }: TagProps) {
  const t = TONES[tone]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 24,
      padding: '0 10px',
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: -0.1,
      fontFamily: 'var(--cs-font)',
      whiteSpace: 'nowrap',
    }}>
      {icon}
      {children}
    </span>
  )
}
