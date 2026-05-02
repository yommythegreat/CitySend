/**
 * incidentStore — Cross-app incident report bridge.
 *
 * Supabase mode: CRUD on `incidents` table + realtime.
 * Fallback mode: localStorage['cs_incidents_v1'].
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { IncidentReport } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const INCIDENTS_STORAGE_KEY = 'cs_incidents_v1'

// ── DB row → TypeScript type ──────────────────────────────────────────────────

function rowToIncident(row: Record<string, any>): IncidentReport {
  return {
    id:           row.id,
    orderId:      row.order_id,
    source:       row.source,
    reporterId:   row.reporter_id,
    reporterName: row.reporter_name,
    category:     row.category,
    description:  row.description,
    severity:     row.severity,
    status:       row.status,
    assignedTo:   row.assigned_to ?? undefined,
    notes:        Array.isArray(row.notes) ? row.notes : [],
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }
}

function incidentToRow(i: IncidentReport): Record<string, any> {
  return {
    id:            i.id,
    order_id:      i.orderId,
    source:        i.source,
    reporter_id:   i.reporterId,
    reporter_name: i.reporterName,
    category:      i.category,
    description:   i.description,
    severity:      i.severity,
    status:        i.status,
    assigned_to:   i.assignedTo ?? null,
    notes:         i.notes,
    created_at:    i.createdAt,
    updated_at:    i.updatedAt,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchIncidents(): Promise<IncidentReport[]> {
  if (!isSupabaseConfigured) return getSharedIncidents()

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[incidentStore] fetchIncidents error', error)
    return getSharedIncidents()
  }
  return (data ?? []).map(rowToIncident)
}

// ── Add ───────────────────────────────────────────────────────────────────────

export async function addIncident(incident: IncidentReport): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSharedIncidents()
    setSharedIncidents([incident, ...current])
    return
  }
  const { error } = await supabase
    .from('incidents')
    .insert(incidentToRow(incident))
  if (error) console.error('[incidentStore] addIncident error', error)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateIncident(
  id: string,
  patch: Partial<IncidentReport>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const current = getSharedIncidents()
    setSharedIncidents(
      current.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i),
    )
    return
  }

  // Convert patch keys to snake_case for DB
  const dbPatch: Record<string, any> = {}
  if (patch.status      !== undefined) dbPatch.status       = patch.status
  if (patch.assignedTo  !== undefined) dbPatch.assigned_to  = patch.assignedTo
  if (patch.severity    !== undefined) dbPatch.severity      = patch.severity
  if (patch.notes       !== undefined) dbPatch.notes         = patch.notes
  if (patch.description !== undefined) dbPatch.description   = patch.description
  dbPatch.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('incidents')
    .update(dbPatch)
    .eq('id', id)
  if (error) console.error('[incidentStore] updateIncident error', error)
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToIncidents(
  onInsert: (incident: IncidentReport) => void,
  onUpdate: (incident: IncidentReport) => void,
): () => void {
  if (!isSupabaseConfigured) {
    const handler = (e: StorageEvent) => {
      if (e.key !== INCIDENTS_STORAGE_KEY || !e.newValue) return
      try {
        const incidents = JSON.parse(e.newValue) as IncidentReport[]
        if (Array.isArray(incidents) && incidents.length > 0) {
          onInsert(incidents[0])
        }
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }

  const channel: RealtimeChannel = supabase
    .channel('incidents-changes')
    .on('postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'incidents' },
      (payload: any) => onInsert(rowToIncident(payload.new)))
    .on('postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'incidents' },
      (payload: any) => onUpdate(rowToIncident(payload.new)))
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── ID generator ──────────────────────────────────────────────────────────────

let _counter = 1000
export function newIncidentId(): string {
  return `INC-${String(++_counter).padStart(4, '0')}`
}

// ── Legacy localStorage API ───────────────────────────────────────────────────

export function getSharedIncidents(): IncidentReport[] {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(INCIDENTS_STORAGE_KEY)
      : null
    if (raw) {
      const parsed = JSON.parse(raw) as IncidentReport[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export function setSharedIncidents(incidents: IncidentReport[]): void {
  try {
    const value = JSON.stringify(incidents)
    localStorage.setItem(INCIDENTS_STORAGE_KEY, value)
    window.dispatchEvent(new StorageEvent('storage', {
      key: INCIDENTS_STORAGE_KEY, newValue: value, storageArea: localStorage,
    }))
  } catch {}
}
