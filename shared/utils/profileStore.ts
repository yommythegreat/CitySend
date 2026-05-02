/**
 * profileStore — reads public.profiles for the admin panel.
 *
 * Profiles are created automatically by the handle_new_user() trigger
 * whenever a row is inserted into auth.users.
 * The email column was added in migration 002_fix_profiles.sql.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UserRole, CityId } from '../types'

export interface ProfileRow {
  id:        string
  name:      string
  email:     string
  phone:     string
  role:      UserRole
  cityId:    CityId
  createdAt: string
}

export async function fetchProfiles(role: UserRole = 'customer'): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[profileStore] fetchProfiles error', error)
    return []
  }

  return (data ?? []).map((row: Record<string, any>): ProfileRow => ({
    id:        row.id,
    name:      row.name || row.email?.split('@')[0] || 'Unknown',
    email:     row.email || '',
    phone:     row.phone || '',
    role:      row.role as UserRole,
    cityId:    (row.city_id || 'winnipeg') as CityId,
    createdAt: row.created_at,
  }))
}
