import React, { lazy, useState, type ComponentType } from 'react'

/**
 * lazyScreen — code-split a screen out of the startup bundle, with preload.
 *
 * The screen's chunk isn't downloaded/parsed at launch. App calls .preload()
 * on every lazy screen once the first frame is idle, so by the time the user
 * navigates the module is already in memory and renders synchronously — no
 * Suspense fallback flash. If they navigate before the preload lands, it falls
 * back to React.lazy (brief blank frame, then the screen).
 *
 * The component type is chosen once per mount (useState initializer) so a
 * screen first rendered via React.lazy never swaps type mid-life and remounts.
 */
export function lazyScreen<P extends object>(
  loader: () => Promise<ComponentType<P>>,
): ComponentType<P> & { preload: () => Promise<ComponentType<P>> } {
  let loaded: ComponentType<P> | null = null
  let pending: Promise<ComponentType<P>> | null = null

  const preload = () => {
    if (!pending) pending = loader().then(c => (loaded = c))
    return pending
  }

  const Lazy = lazy(() => preload().then(c => ({ default: c })))

  function Screen(props: P) {
    const [C] = useState<ComponentType<P>>(() => loaded ?? (Lazy as unknown as ComponentType<P>))
    return <C {...props} />
  }

  return Object.assign(Screen, { preload })
}
