import React from 'react'
import { IconButton } from './IconButton'
import { Back } from './Icons'
import { GuestPrompt } from './GuestPrompt'
import type { ScreenName } from '../types'

interface Props {
  go:             (screen: ScreenName) => void
  screenTitle:    string
  backTarget:     ScreenName
  enterClass?:    'cs-enter-up' | 'cs-enter-right'
  promptTitle?:   string
  promptMessage?: string
}

/**
 * Wrapper that renders a titled top bar + full-screen GuestPrompt for any
 * screen that guests cannot access. Use instead of repeating the div+back+prompt
 * boilerplate in every gated screen.
 */
export function GuestGatedScreen({
  go,
  screenTitle,
  backTarget,
  enterClass  = 'cs-enter-right',
  promptTitle,
  promptMessage,
}: Props) {
  return (
    <div className={`cs-screen ${enterClass}`}>
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go(backTarget)}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{screenTitle}</div>
      </div>
      <GuestPrompt
        go={go}
        title={promptTitle}
        message={promptMessage}
        onDismiss={() => go(backTarget)}
      />
    </div>
  )
}
