/**
 * DriverContext — Supabase-backed state for the Driver App.
 *
 * Data layer:
 *   • Auth: Supabase signInWithPassword (falls back to mock credentials).
 *   • Orders: fetched from Supabase on login; realtime subscription keeps
 *     them current (replaces StorageEvent listener).
 *   • Status updates: written to Supabase + optimistic local state.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import type { Order, Driver, OrderStatus, AdminNote } from '@shared/types'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import {
  fetchOrders, subscribeToOrders,
  getSharedOrders, setSharedOrders, ORDERS_STORAGE_KEY,
} from '@shared/utils/orderStore'
import { pushNotification } from '@shared/utils/notificationStore'
import {
  startLocationBroadcast,
  stopLocationBroadcast,
  updateBroadcastOrder,
} from '@shared/utils/locationStore'

// ── Driver sub-steps (local UI only, not in shared model) ─────────────────────

export type DeliverySubstep =
  | 'accepted'
  | 'at_pickup'
  | 'picked_up'
  | 'at_dropoff'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface DriverAuth {
  driverId: string
  name: string
  email: string
  vehicle: string
  phone: string
  rating: number
  completedOrders: number
}

// ── Job Offer State ──────────────────────────────────────────────────────────

export interface JobOffer {
  order: Order
  showModal: boolean
  timeRemaining: number  // countdown seconds (starts at 120)
}

// ── State ─────────────────────────────────────────────────────────────────────

interface DriverState {
  auth:      DriverAuth | null
  orders:    Order[]
  substeps:  Record<string, DeliverySubstep>
  jobOffer:  JobOffer | null
}

const initialState: DriverState = {
  auth:     loadAuth(),
  orders:   [],
  substeps: {},
  jobOffer: null,
}

function loadAuth(): DriverAuth | null {
  try {
    const raw = sessionStorage.getItem('cs_driver_auth')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN';               auth: DriverAuth }
  | { type: 'LOGOUT' }
  | { type: 'SET_SUBSTEP';         orderId: string; substep: DeliverySubstep }
  | { type: 'UPDATE_STATUS';       orderId: string; status: OrderStatus }
  | { type: 'ADD_NOTE';            orderId: string; note: AdminNote }
  | { type: '_HYDRATE_ORDERS';     orders: Order[] }
  | { type: '_UPSERT_ORDER';       order: Order }
  | { type: 'SHOW_JOB_OFFER';      order: Order }
  | { type: 'HIDE_JOB_OFFER'; accepted?: boolean }
  | { type: 'TICK_JOB_OFFER_TIMER' }
  | { type: 'ACCEPT_JOB'; orderId: string; driverId: string }

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: DriverState, action: Action): DriverState {
  switch (action.type) {

    case 'LOGIN':
      sessionStorage.setItem('cs_driver_auth', JSON.stringify(action.auth))
      return { ...state, auth: action.auth }

    case 'LOGOUT':
      sessionStorage.removeItem('cs_driver_auth')
      return { ...state, auth: null, substeps: {}, orders: [] }

    case 'SET_SUBSTEP':
      return { ...state, substeps: { ...state.substeps, [action.orderId]: action.substep } }

    case 'UPDATE_STATUS': {
      const now = new Date().toISOString()
      const updated = state.orders.map(o =>
        o.id !== action.orderId ? o : { ...o, status: action.status, updatedAt: now }
      )
      return { ...state, orders: updated }
    }

    case 'ADD_NOTE': {
      const updated = state.orders.map(o =>
        o.id !== action.orderId ? o : {
          ...o, notes: [...o.notes, action.note], updatedAt: new Date().toISOString(),
        }
      )
      return { ...state, orders: updated }
    }

    case '_HYDRATE_ORDERS':
      return { ...state, orders: action.orders }

    case '_UPSERT_ORDER': {
      const exists = state.orders.some(o => o.id === action.order.id)
      const newOrders = exists
        ? state.orders.map(o => o.id === action.order.id ? action.order : o)
        : [...state.orders, action.order]

      // Auto-show job offer if new order is assigned to this driver
      let newJobOffer = state.jobOffer
      if (!newJobOffer && action.order.status === 'assigned' &&
          action.order.assignedDriverId === state.auth?.driverId) {
        newJobOffer = {
          order: action.order,
          showModal: true,
          timeRemaining: 120,
        }
      }

      return { ...state, orders: newOrders, jobOffer: newJobOffer }
    }

    case 'SHOW_JOB_OFFER': {
      // Also upsert the order into state.orders so DeliveryScreen can find it
      const exists = state.orders.some(o => o.id === action.order.id)
      return {
        ...state,
        orders: exists ? state.orders : [...state.orders, action.order],
        jobOffer: {
          order: action.order,
          showModal: true,
          timeRemaining: 120,
        },
      }
    }

    case 'HIDE_JOB_OFFER':
      return { ...state, jobOffer: null }

    case 'TICK_JOB_OFFER_TIMER':
      if (!state.jobOffer) return state
      if (state.jobOffer.timeRemaining <= 1) {
        return { ...state, jobOffer: null }
      }
      return {
        ...state,
        jobOffer: {
          ...state.jobOffer,
          timeRemaining: state.jobOffer.timeRemaining - 1,
        },
      }

    default: return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting'

export interface SyncError {
  message: string
  retry:   () => void
}

interface DriverContextValue {
  state:            DriverState
  dispatch:         React.Dispatch<Action>
  myOrders:         Order[]
  activeOrders:     Order[]
  completedOrders:  Order[]
  jobOffer:         JobOffer | null
  connectionStatus: ConnectionStatus
  syncError:        SyncError | null
  clearSyncError:   () => void
}

const DriverContext = createContext<DriverContextValue | null>(null)

// ── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 600): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn() }
    catch (err) {
      if (i === attempts - 1) throw err
      await new Promise(r => setTimeout(r, baseMs * 2 ** i))
    }
  }
  throw new Error('unreachable')
}

// ── Supabase side-effects for driver actions ──────────────────────────────────

async function syncDriverAction(
  action: Action,
  snapshot: DriverState,
): Promise<void> {
  if (!isSupabaseConfigured) return
  const now = new Date().toISOString()

  switch (action.type) {

    case 'UPDATE_STATUS': {
      const order = snapshot.orders.find(o => o.id === action.orderId)

      // Update order status in DB — retried up to 3x before surfacing error
      await withRetry(async () => {
        const { error } = await supabase.from('orders').update({
          status: action.status, updated_at: now,
        }).eq('id', action.orderId)
        if (error) throw error
      })

      // Non-critical side-effects: notification + delivered cleanup run in parallel
      // so neither blocks the other after the primary write has succeeded.
      await Promise.all([
        // Customer notification
        (async () => {
          if (!order) return
          const notifMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
            picked_up:  { title: 'Parcel picked up', body: `${snapshot.auth?.name ?? 'Your driver'} has picked up your parcel.` },
            in_transit: { title: 'Driver en route',  body: `Your parcel is on the way to ${order.dropoff.name}.` },
            delivered:  { title: 'Delivered! 🎉',    body: `Your parcel has been delivered to ${order.dropoff.name}.` },
          }
          const n = notifMap[action.status]
          if (n) {
            await pushNotification({
              event: action.status as any, audience: 'customer',
              orderId: action.orderId, ...n,
              customerId: order.customerId, driverId: snapshot.auth?.driverId,
            })
          }
        })(),

        // Delivered: plausibility check + free driver row
        (async () => {
          if (action.status !== 'delivered' || !snapshot.auth) return

          // Plausibility: minimum 90 s per km (≈ 40 km/h).
          // snapshot.orders has the pre-delivered updatedAt (set at in_transit).
          if (order) {
            const elapsedSeconds = (Date.now() - new Date(order.updatedAt).getTime()) / 1000
            const minSeconds     = order.distanceKm * 90
            if (elapsedSeconds < minSeconds) {
              const flagNote = {
                id:         `integrity-${Date.now()}`,
                text:       `⚠️ INTEGRITY FLAG: Delivered in ${Math.round(elapsedSeconds)}s for a ${order.distanceKm} km route (minimum expected: ${Math.round(minSeconds)}s). Possible GPS spoof or fraudulent completion. Driver: ${snapshot.auth.name}.`,
                authorName: 'System',
                createdAt:  now,
              }
              await supabase.from('orders')
                .update({ notes: [...order.notes, flagNote] })
                .eq('id', action.orderId)
            }
          }

          await supabase.from('drivers').update({
            status: 'available', current_order_id: null,
            completed_orders: snapshot.auth.completedOrders + 1,
          }).eq('id', snapshot.auth.driverId)
        })(),
      ])
      break
    }

    case 'ADD_NOTE': {
      const order = snapshot.orders.find(o => o.id === action.orderId)
      if (!order) return
      // Cap at 50 notes to prevent unbounded JSONB growth
      const updatedNotes = [...order.notes, action.note].slice(-50)
      await withRetry(async () => {
        const { error } = await supabase.from('orders').update({
          notes: updatedNotes, updated_at: now,
        }).eq('id', action.orderId)
        if (error) throw error
      })
      break
    }

    case 'ACCEPT_JOB': {
      // Critical write — driver must be marked busy before starting pickup
      await withRetry(async () => {
        const { error } = await supabase.from('drivers').update({
          status: 'busy', current_order_id: action.orderId,
        }).eq('id', action.driverId)
        if (error) throw error
      })
      break
    }

    case 'SHOW_JOB_OFFER': {
      if (!snapshot.auth) break
      try {
        const { data } = await supabase.from('drivers').select('offers_received').eq('id', snapshot.auth.driverId).maybeSingle()
        await supabase.from('drivers').update({ offers_received: (data?.offers_received ?? 0) + 1 }).eq('id', snapshot.auth.driverId)
      } catch { /* non-critical */ }
      break
    }

    case 'HIDE_JOB_OFFER': {
      // accepted === true means the driver tapped Accept; false/undefined = decline or timeout
      if (!action.accepted && snapshot.auth && snapshot.jobOffer?.showModal) {
        try {
          const { data } = await supabase.from('drivers').select('offers_declined').eq('id', snapshot.auth.driverId).maybeSingle()
          await supabase.from('drivers').update({ offers_declined: (data?.offers_declined ?? 0) + 1 }).eq('id', snapshot.auth.driverId)
        } catch { /* non-critical */ }
      }
      break
    }

    default: break
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch]           = useReducer(reducer, initialState)
  const [connectionStatus, setConnStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline',
  )
  const [syncError, setSyncError] = useState<SyncError | null>(null)
  // Incrementing this causes the subscription useEffect to resubscribe
  const [subscribeKey, setSubscribeKey] = useState(0)

  const snapshotRef = React.useRef<DriverState>(state)
  useEffect(() => { snapshotRef.current = state }, [state])

  const dispatch = useCallback((action: Action) => {
    const snapshot = snapshotRef.current
    baseDispatch(action)
    syncDriverAction(action, snapshot).catch(err => {
      console.error('[DriverContext] syncDriverAction error', err)
      if (action.type === 'UPDATE_STATUS') {
        setSyncError({
          message: `"${action.status}" status failed to save. Check your connection.`,
          retry: () => syncDriverAction(action, snapshot).catch(console.error),
        })
      } else if (action.type === 'ACCEPT_JOB') {
        setSyncError({
          message: 'Failed to accept job — tap Retry now or the job may be reassigned.',
          retry: () => syncDriverAction(action, snapshot).catch(console.error),
        })
      }
    })
  }, [])

  // ── Supabase auth state listener ────────────────────────────────────────────
  // Supabase is the single source of truth for auth.
  // SIGNED_OUT  → clear driver state (mirrors handleLogout for external logouts)
  // INITIAL_SESSION with no session → wipe any stale sessionStorage auth
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        baseDispatch({ type: 'LOGOUT' })
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No valid Supabase session on load — clear any stale sessionStorage auth
        // that may have survived a previous improperly-terminated session
        if (sessionStorage.getItem('cs_driver_auth')) {
          baseDispatch({ type: 'LOGOUT' })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load orders when auth is established — limit to 90 days to avoid full-table scan.
  // Realtime subscription catches anything newer that arrives after this snapshot.
  useEffect(() => {
    if (!state.auth) return
    let cancelled = false

    async function load() {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      try {
        const orders = await fetchOrders(since)
        if (!cancelled) baseDispatch({ type: '_HYDRATE_ORDERS', orders })
      } catch {
        if (!cancelled) baseDispatch({ type: '_HYDRATE_ORDERS', orders: getSharedOrders() })
      }
    }
    load()
    return () => { cancelled = true }
  }, [state.auth?.driverId])

  // Push order status changes to shared store (localStorage fallback)
  useEffect(() => {
    if (isSupabaseConfigured) return
    setSharedOrders(state.orders)
  }, [state.orders])

  // Network online / offline detection + reconnect
  useEffect(() => {
    const onOffline = () => {
      setConnStatus('offline')
    }

    const onOnline = async () => {
      setConnStatus('reconnecting')
      // Jitter: spread reconnect fetches across a 2s window so all clients
      // don't hammer the DB simultaneously when a network blip resolves.
      await new Promise(r => setTimeout(r, Math.random() * 2000))
      try {
        const since  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const orders = await fetchOrders(since)
        baseDispatch({ type: '_HYDRATE_ORDERS', orders })
      } catch (e) {
        console.warn('[DriverContext] re-fetch failed', e)
      }
      setSubscribeKey(k => k + 1)   // resubscribe realtime
      setConnStatus('online')
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  // Realtime: subscribe to all order changes (resubscribes on reconnect via subscribeKey)
  useEffect(() => {
    const unsubOrders = subscribeToOrders(
      (order) => baseDispatch({ type: '_UPSERT_ORDER', order }),
      (order) => baseDispatch({ type: '_UPSERT_ORDER', order }),
      (_id)   => { /* no deletions */ },
    )

    // Legacy localStorage listener
    const legacyHandler = (e: StorageEvent) => {
      if (isSupabaseConfigured) return
      if (e.key !== ORDERS_STORAGE_KEY || !e.newValue) return
      try {
        const incoming = JSON.parse(e.newValue) as Order[]
        if (Array.isArray(incoming)) baseDispatch({ type: '_HYDRATE_ORDERS', orders: incoming })
      } catch {}
    }
    window.addEventListener('storage', legacyHandler)

    return () => {
      unsubOrders()
      window.removeEventListener('storage', legacyHandler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeKey])

  // Job offer countdown timer
  useEffect(() => {
    if (!state.jobOffer?.showModal) return
    const interval = setInterval(() => {
      baseDispatch({ type: 'TICK_JOB_OFFER_TIMER' })
    }, 1000)
    return () => clearInterval(interval)
  }, [state.jobOffer?.showModal])

  // GPS broadcast — start when driver logs in, stop on logout
  useEffect(() => {
    const driverId = state.auth?.driverId
    if (!driverId) { stopLocationBroadcast(); return }

    // Find the active order ID (if any)
    const activeOrder = state.orders.find(
      o => o.assignedDriverId === driverId &&
           o.status !== 'delivered' && o.status !== 'cancelled',
    )
    startLocationBroadcast(driverId, activeOrder?.id ?? null)

    return () => stopLocationBroadcast()
  // Re-run only when driverId or the active order changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.auth?.driverId])

  // When active order changes, update the broadcast orderId without restarting the watch
  useEffect(() => {
    const driverId = state.auth?.driverId
    if (!driverId) return
    const activeOrder = state.orders.find(
      o => o.assignedDriverId === driverId &&
           o.status !== 'delivered' && o.status !== 'cancelled',
    )
    updateBroadcastOrder(driverId, activeOrder?.id ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.orders.find(o =>
      o.assignedDriverId === state.auth?.driverId &&
      o.status !== 'delivered' && o.status !== 'cancelled',
    )?.id,
  ])

  const myOrders = state.auth
    ? state.orders
        .filter(o => o.assignedDriverId === state.auth!.driverId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const activeOrders    = myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const completedOrders = myOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled')

  return (
    <DriverContext.Provider value={{
      state,
      dispatch,
      myOrders,
      activeOrders,
      completedOrders,
      jobOffer: state.jobOffer,
      connectionStatus,
      syncError,
      clearSyncError: () => setSyncError(null),
    }}>
      {children}
    </DriverContext.Provider>
  )
}

export function useDriver() {
  const ctx = useContext(DriverContext)
  if (!ctx) throw new Error('useDriver must be used inside DriverProvider')
  return ctx
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Sign in a driver using Supabase Auth.
 * Falls back to mock credentials when Supabase is not configured.
 */
export async function authenticateDriver(
  email: string,
  password: string,
): Promise<DriverAuth | null> {
  const canonEmail = email.trim().toLowerCase()

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: canonEmail, password,
    })
    if (error || !data.user) return null

    // Load driver record linked to this auth user via user_id (not email)
    const { data: driverRow } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (!driverRow) return null

    return {
      driverId:        driverRow.id,
      name:            driverRow.name,
      email:           driverRow.email,
      vehicle:         driverRow.vehicle,
      phone:           driverRow.phone,
      rating:          Number(driverRow.rating),
      completedOrders: driverRow.completed_orders,
    }
  }

  // Supabase auth is required — no offline fallback in production
  return null
}

/**
 * Sign out the current driver session.
 */
export async function signOutDriver(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut()
  }
  sessionStorage.removeItem('cs_driver_auth')
}
