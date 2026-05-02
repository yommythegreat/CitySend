/**
 * Supabase client — shared across Admin and Driver apps via @shared alias.
 * Customer app has its own copy at app/src/lib/supabase.ts.
 *
 * Requires each app's .env to define:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL  as string | undefined
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once real credentials are present in the environment. */
export const isSupabaseConfigured =
  typeof url === 'string' && url.startsWith('https://') &&
  typeof key === 'string' && key.length > 20

export const supabase = createClient(
  url  ?? 'https://placeholder.supabase.co',
  key  ?? 'placeholder-anon-key',
)
