/**
 * DriverContext — Supabase-backed state for the Driver App.
 *
 * Data layer:
 *   • Auth: Supabase signInWithPassword (falls back to mock credentials).
 *   • Orders: fetched from Supabase on login; realtime subscription keeps
 *     them current (replaces StorageEvent listener).
 *   • Status updates: written to Supabase + optimistic local state.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type { Order, Driver, OrderStatus, AdminNote } from '@shared/types'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import {
  fetchOrders, subscribeToOrders,
  getSharedOrders, setSharedOrders, ORDERS_STORAGE_KEY,
} from '@shared/utils/orderStore'
import { pushNotification } from '@shared/utils/notificationStore'
import { MOCK_DRIVERS } from '@shared/mock-data/drivers'

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

// ── State ─────────────────────────────────────────────────────────────────────

interface DriverState {
  auth:     DriverAuth | null
  orders:   Order[]
  substeps: Record<string, DeliverySubstep>
}

const initialState: DriverState = {
  auth:     loadAuth(),
  orders:   [],
  substeps: {},
}

function loadAuth(): DriverAuth | null {
  try {
    const raw = sessionStorage.getItem('cs_driver_auth')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN';            auth: DriverAuth }
  | { type: 'LOGOUT' }
  | { type: 'SET_SUBSTEP';      orderId: string; substep: DeliverySubstep }
  | { type: 'UPDATE_STATUS';    orderId: string; status: OrderStatus }
  | { type: 'ADD_NOTE';         orderId: string; note: AdminNote }
  | { type: '_HYDRATE_ORDERS';  orders: Order[] }
  | { type: '_UPSERT_ORDER';    order: Order }

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
      return {
        ...state,
        orders: exists
          ? state.orders.map(o => o.id === action.order.id ? action.order : o)
          : [...state.orders, action.order],
      }
    }

    default: return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface DriverContextValue {
  state:           DriverState
  dispatch:        React.Dispatch<Action>
  myOrders:        Order[]
  activeOrders:    Order[]
  completedOrders: Order[]
}

const DriverContext = createContext<DriverContextValue | null>(null)

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

      // Update order status in DB
      await supabase.from('orders').update({
        status: action.status, updated_at: now,
      }).eq('id', action.orderId)

      // Push customer notification
      if (order) {
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
      }

      // If delivered: free up driver + increment completedOrders
      if (action.status === 'delivered' && snapshot.auth) {
        await supabase.from('drivers').update({
          status: 'available', current_order_id: null,
          completed_orders: snapshot.auth.completedOrders + 1,
        }).eq('id', snapshot.auth.driverId)
      }
      break
    }

    case 'ADD_NOTE': {
      const order = snapshot.orders.find(o => o.id === action.orderId)
      if (!order) return
      const updatedNotes = [...order.notes, action.note]
      await supabase.from('orders').update({
        notes: updatedNotes, updated_at: now,
      }).eq('id', action.orderId)
      break
    }

    default: break
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState)

  const snapshotRef = React.useRef<DriverState>(state)
  useEffect(() => { snapshotRef.current = state }, [state])

  const dispatch = useCallback((action: Action) => {
    const snapshot = snapshotRef.current
    baseDispatch(action)
    syncDriverAction(action, snapshot).catch(err =>
      console.error('[DriverContext] syncDriverAction error', err),
    )
  }, [])

  // ── Supabase auth state listener ────────────────────────────────────────────
  // Supabase is the single source of truth for auth.
  // SIGNED_OUT  → clear driver state (mirrors handleLogout for external logouts)
  // INITIAL_SESSION with no session → wipe any stale sessionStorage auth
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[DriverAuth] state change:', event, session?.user?.email ?? 'no user')

      if (event === 'SIGNED_OUT') {
        console.log('[DriverAuth] SIGNED_OUT — clearing driver state')
        baseDispatch({ type: 'LOGOUT' })
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No valid Supabase session on load — clear any stale sessionStorage auth
        // that may have survived a previous improperly-terminated session
        if (sessionStorage.getItem('cs_driver_auth')) {
          console.log('[DriverAuth] INITIAL_SESSION: no Supabase session, clearing stale driver auth')
          baseDispatch({ type: 'LOGOUT' })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load orders when auth is established
  useEffect(() => {
    if (!state.auth) return
    let cancelled = false

    async function load() {
      try {
        const orders = await fetchOrders()
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

  // Realtime: subscribe to all order changes
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
  }, [])

  const myOrders = state.auth
    ? state.orders
        .filter(o => o.assignedDriverId === state.auth!.driverId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const activeOrders    = myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const completedOrders = myOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled')

  return (
    <DriverContext.Provider value={{ state, dispatch, myOrders, activeOrders, completedOrders }}>
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

    // Load driver record linked to this auth user
    const { data: driverRow } = await supabase
      .from('drivers')
      .select('*')
      .eq('email', canonEmail)
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
