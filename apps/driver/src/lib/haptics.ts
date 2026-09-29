/**
 * haptics — small tactile confirmations for in-car use, where the driver
 * may not be looking at the screen. No-op on web.
 */

import { Capacitor } from '@capacitor/core'

type Kind = 'tap' | 'confirm' | 'success' | 'warning'

export function haptic(kind: Kind = 'tap'): void {
  if (!Capacitor.isNativePlatform()) return
  import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      switch (kind) {
        case 'tap':     return Haptics.impact({ style: ImpactStyle.Light })
        case 'confirm': return Haptics.impact({ style: ImpactStyle.Medium })
        case 'success': return Haptics.notification({ type: NotificationType.Success })
        case 'warning': return Haptics.notification({ type: NotificationType.Warning })
      }
    })
    .catch(() => {})
}
