/// <reference types="vite/client" />
/**
 * Supabase client for the Customer app.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured =
  typeof url === 'string' && url.startsWith('https://') &&
  typeof key === 'string' && key.length > 20

export const supabase = createClient(
  url  ?? 'https://placeholder.supabase.co',
  key  ?? 'placeholder-anon-key',
)
