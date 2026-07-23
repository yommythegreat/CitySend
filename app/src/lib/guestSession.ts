/**
 * guestSession — anonymous Supabase auth for guest checkout.
 *
 * A guest keeps an ephemeral "guest" UI identity, but their orders are written
 * under a real Supabase *anonymous* auth session. This is what makes the
 * orders-table RLS pass: `customers_insert_orders` (migration 005) requires
 *   auth.uid() is not null AND customer_id = auth.uid()::text
 * and the notifications INSERT policy (migration 019) requires
 *   auth.uid() is not null.
 * An anonymous user satisfies both (anon users are `authenticated` with a real
 * uid). Without it, a guest is charged but the order fails to save.
 *
 * The anonymous uid is used only as the order's customer_id — the app never
 * surfaces the anon session as a signed-in user (see the is_anonymous guard in
 * App.tsx's onAuthStateChange handler).
 */

import { supabase, isSupabaseConfigured } from './supabase'

let cachedUid: string | null = null

/**
 * Ensure an anonymous session exists and return its uid (null if unavailable,
 * e.g. no Supabase configured or anon sign-ins disabled). Reuses an existing
 * anonymous session; never hijacks a real signed-in one.
 */
export async function ensureGuestSession(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  if (cachedUid) return cachedUid

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    // A real (non-anonymous) session means we're not a guest — leave it alone.
    if (!session.user.is_anonymous) return null
    cachedUid = session.user.id
    return cachedUid
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    console.warn('[guestSession] anonymous sign-in failed:', error?.message)
    return null
  }
  cachedUid = data.user.id
  return cachedUid
}

/**
 * Sign out the anonymous session and clear the cache (guest logout). Checks the
 * live session rather than the cache: a guest restored on page load never called
 * ensureGuestSession, so the cache alone would miss their session and a reload
 * would resurrect the "logged-out" guest.
 */
export async function clearGuestSession(): Promise<void> {
  cachedUid = null
  if (!isSupabaseConfigured) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.is_anonymous) await supabase.auth.signOut()
  } catch { /* best-effort */ }
}
