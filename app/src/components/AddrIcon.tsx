import React from 'react'
import { Home as HomeIcon, Package, Pin } from './Icons'
import type { SavedAddress } from '../types'

export const ADDR_ICONS: SavedAddress['icon'][] = ['home', 'package', 'pin']

export const ICON_LABELS: Record<SavedAddress['icon'], string> = {
  home:    'Home',
  package: 'Work',
  pin:     'Other',
}

export function AddrIcon({ icon, size = 16 }: { icon: SavedAddress['icon']; size?: number }) {
  if (icon === 'home')    return <HomeIcon size={size} />
  if (icon === 'package') return <Package size={size} />
  return <Pin size={size} />
}
