/**
 * AdminContext — Supabase-backed state for the Admin Console.
 *
 * Data layer:
 *   • Initial load: fetched from Supabase on mount (falls back to
 *     localStorage/mock data when Supabase is not configured).
 *   • Mutations: written to Supabase first, then applied to local state
 *     optimistically via the reducer.
 *   • Realtime: Supabase postgres_changes subscriptions replace the old
 *     StorageEvent listeners.
 *
 * The reducer and Action types are unchanged — screens continue to call
 * dispatch() exactly as before.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type { Order, Driver, User, Receipt, OrderStatus, AdminNote, IncidentReport } from '@shared/types'
import type { CityConfig } from '@shared/config/cityConfig'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import {
  fetchOrders, upsertOrder, subscribeToOrders,
  orderToRow, getSharedOrders, setSharedOrders, ORDERS_STORAGE_KEY,
} from '@shared/utils/orderStore'
import {
  fetchReceipts, insertReceipt, subscribeToReceipts,
  getSharedReceipts, setSharedReceipts,
} from '@shared/utils/receiptStore'
import {
  fetchIncidents, addIncident, updateIncident as dbUpdateIncident,
  subscribeToIncidents, getSharedIncidents, setSharedIncidents,
} from '@shared/utils/incidentStore'
import { pushNotification } from '@shared/utils/notificationStore'
import {
  fetchCityConfigs, saveCityConfig, saveAllCityConfigs, subscribeToCityConfigs,
  getSystemCityConfigs, setSystemCityConfigs,
} from '@shared/utils/configStore'
import { fetchProfiles } from '@shared/utils/profileStore'

// ── State ─────────────────────────────────────────────────────────────────────

interface AdminState {
  orders:      Order[]
  drivers:     Driver[]
  users:       User[]
  receipts:    Receipt[]
  incidents:   IncidentReport[]
  cityConfigs: CityConfig[]
  loading:     boolean
}

const initialState: AdminState = {
  orders:      [],
  drivers:     [],
  users:       [],           // populated from public.profiles on mount
  receipts:    [],
  incidents:   [],
  cityConfigs: getSystemCityConfigs(),
  loading:     true,
}

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ASSIGN_DRIVER';        orderId: string; driverId: string }
  | { type: 'UNASSIGN_DRIVER';      orderId: string; driverId?: string }
  | { type: 'UPDATE_ORDER_STATUS';  orderId: string; status: OrderStatus }
  | { type: 'CANCEL_ORDER';         orderId: string; reason: string }
  | { type: 'ADD_NOTE';             orderId: string; note: AdminNote }
  | { type: 'CREATE_ORDER';         order: Order }
  | { type: 'ADD_DRIVER';           driver: Driver }
  | { type: 'UPDATE_DRIVER';        driverId: string; patch: Partial<Driver> }
  | { type: 'UPDATE_CITY_CONFIG';   cityId: string; patch: Partial<CityConfig> }
  | { type: 'RESET_CITY_CONFIGS' }
  | { type: 'ADD_INCIDENT';         incident: IncidentReport }
  | { type: 'UPDATE_INCIDENT';      id: string; patch: Partial<IncidentReport> }
  | { type: '_HYDRATE_ORDERS';      orders: Order[] }
  | { type: '_HYDRATE_DRIVERS';     drivers: Driver[] }
  | { type: '_HYDRATE_USERS';       users: User[] }
  | { type: '_HYDRATE_RECEIPTS';    receipts: Receipt[] }
  | { type: '_HYDRATE_INCIDENTS';   incidents: IncidentReport[] }
  | { type: '_HYDRATE_CONFIGS';     configs: CityConfig[] }
  | { type: '_SET_LOADING';         value: boolean }
  | { type: '_UPSERT_ORDER';        order: Order }
  | { type: '_UPSERT_INCIDENT';     incident: IncidentReport }

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AdminState, action: Action): AdminState {
  switch (action.type) {

    case '_SET_LOADING':
      return { ...state, loading: action.value }

    case '_HYDRATE_ORDERS':
      return { ...state, orders: action.orders, loading: false }

    case '_HYDRATE_DRIVERS':
      return { ...state, drivers: action.drivers }

    case '_HYDRATE_USERS':
      return { ...state, users: action.users }

    case '_HYDRATE_RECEIPTS':
      return { ...state, receipts: action.receipts }

    case '_HYDRATE_INCIDENTS':
      return { ...state, incidents: action.incidents }

    case '_HYDRATE_CONFIGS':
      return { ...state, cityConfigs: action.configs }

    case '_UPSERT_ORDER': {
      const exists = state.orders.some(o => o.id === action.order.id)
      return {
        ...state,
        orders: exists
          ? state.orders.map(o => o.id === action.order.id ? action.order : o)
          : [action.order, ...state.orders],
      }
    }

    case '_UPSERT_INCIDENT': {
      const exists = state.incidents.some(i => i.id === action.incident.id)
      return {
        ...state,
        incidents: exists
          ? state.incidents.map(i => i.id === action.incident.id ? action.incident : i)
          : [action.incident, ...state.incidents],
      }
    }

    case 'ASSIGN_DRIVER': {
      const driver = state.drivers.find(d => d.id === action.driverId)
      if (!driver) return state
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id !== action.orderId ? o : {
            ...o,
            assignedDriverId:   action.driverId,
            assignedDriverName: driver.name,
            status:             o.status === 'new' ? 'offered' : o.status,
            updatedAt:          new Date().toISOString(),
          }
        ),
        drivers: state.drivers.map(d =>
          d.id !== action.driverId ? d : {
            ...d, status: 'busy', currentOrderId: action.orderId,
          }
        ),
      }
    }

    case 'UNASSIGN_DRIVER': {
      const order     = state.orders.find(o => o.id === action.orderId)
      const driverToReset = order?.assignedDriverId ?? action.driverId
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id !== action.orderId ? o : {
            ...o,
            status:             'new',
            assignedDriverId:   undefined,
            assignedDriverName: undefined,
            updatedAt:          new Date().toISOString(),
          }
        ),
        drivers: driverToReset
          ? state.drivers.map(d =>
              d.id !== driverToReset ? d : {
                ...d, status: 'available', currentOrderId: undefined,
              }
            )
          : state.drivers,
      }
    }

    case 'UPDATE_ORDER_STATUS': {
      const now   = new Date().toISOString()
      const order = state.orders.find(o => o.id === action.orderId)
      if (!order) return state

      let newReceipts = state.receipts
      let newDrivers  = state.drivers

      if (action.status === 'delivered') {
        newDrivers = state.drivers.map(d =>
          d.currentOrderId !== action.orderId ? d : {
            ...d, status: 'available', currentOrderId: undefined,
            completedOrders: d.completedOrders + 1,
          }
        )
        if (!state.receipts.find(r => r.orderId === action.orderId)) {
          const receipt: Receipt = {
            id:            `RCP-${String(state.receipts.length + 1).padStart(3, '0')}`,
            orderId:       order.id,
            customerId:    order.customerId,
            customerName:  order.customerName,
            amount:        order.priceBreakdown.subtotalPreTax,
            tax:           order.priceBreakdown.totalTax,
            tip:           order.priceBreakdown.tip,
            total:         order.priceBreakdown.total,
            paymentMethod: 'card',
            last4:         '4242',
            brand:         'visa',
            createdAt:     now,
          }
          newReceipts = [receipt, ...state.receipts]
        }
      }

      return {
        ...state,
        orders:   state.orders.map(o =>
          o.id !== action.orderId ? o : { ...o, status: action.status, updatedAt: now }
        ),
        drivers:  newDrivers,
        receipts: newReceipts,
      }
    }

    case 'CANCEL_ORDER': {
      const order = state.orders.find(o => o.id === action.orderId)
      if (!order) return state
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id !== action.orderId ? o : {
            ...o, status: 'cancelled', cancelReason: action.reason,
            updatedAt: new Date().toISOString(),
          }
        ),
        drivers: order.assignedDriverId
          ? state.drivers.map(d =>
              d.id !== order.assignedDriverId ? d : {
                ...d, status: 'available', currentOrderId: undefined,
              }
            )
          : state.drivers,
      }
    }

    case 'ADD_NOTE':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id !== action.orderId ? o : {
            ...o, notes: [...o.notes, action.note], updatedAt: new Date().toISOString(),
          }
        ),
      }

    case 'CREATE_ORDER':
      return { ...state, orders: [action.order, ...state.orders] }

    case 'ADD_DRIVER':
      return { ...state, drivers: [...state.drivers, action.driver] }

    case 'UPDATE_DRIVER':
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id !== action.driverId ? d : { ...d, ...action.patch }
        ),
      }

    case 'UPDATE_CITY_CONFIG':
      return {
        ...state,
        cityConfigs: state.cityConfigs.map(c =>
          c.cityId !== action.cityId ? c : { ...c, ...action.patch }
        ),
      }

    case 'RESET_CITY_CONFIGS':
      if (!isSupabaseConfigured) {
        try { localStorage.removeItem('cs_city_configs_v1') } catch {}
      }
      return { ...state, cityConfigs: getSystemCityConfigs() }

    case 'ADD_INCIDENT':
      return { ...state, incidents: [action.incident, ...state.incidents] }

    case 'UPDATE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.map(i =>
          i.id !== action.id ? i : { ...i, ...action.patch, updatedAt: new Date().toISOString() }
        ),
      }

    default: return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AdminContextValue {
  state:    AdminState
  dispatch: React.Dispatch<Action>
}

const AdminContext = createContext<AdminContextValue | null>(null)

// ── Supabase side-effects ─────────────────────────────────────────────────────

/** Wrap a Supabase query builder so it can be used in Promise.all(). */
function q(query: PromiseLike<any>): Promise<any> { return Promise.resolve(query) }


async function syncToSupabase(action: Action, snapshot: AdminState): Promise<void> {
  if (!isSupabaseConfigured) return
  const now = new Date().toISOString()

  // Resolve admin identity for audit notes (best-effort; falls back to 'Admin')
  let adminLabel = 'Admin'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) adminLabel = `Admin (${user.email})`
  } catch {}

  switch (action.type) {

    case 'ASSIGN_DRIVER': {
      const driver = snapshot.drivers.find(d => d.id === action.driverId)
      const order  = snapshot.orders.find(o => o.id === action.orderId)
      if (!driver || !order) return
      const newStatus = order.status === 'new' ? 'offered' : order.status
      const auditNote: AdminNote = {
        id: `audit-${Date.now()}`,
        text: `🔧 ${adminLabel}: Assigned driver ${driver.name}.`,
        authorName: 'System', createdAt: now,
      }
      await Promise.all([
        q(supabase.from('orders').update({
          assigned_driver_id: action.driverId,
          assigned_driver_name: driver.name,
          status: newStatus, updated_at: now,
          notes: [...order.notes, auditNote],
        }).eq('id', action.orderId)),
        q(supabase.from('drivers').update({
          status: 'busy', current_order_id: action.orderId,
        }).eq('id', action.driverId)),
        pushNotification({
          event: 'driver_assigned', audience: 'customer',
          orderId: action.orderId, title: 'Driver assigned',
          body: `${driver.name} will pick up your parcel soon.`,
          customerId: order.customerId, driverId: driver.id,
        }),
        pushNotification({
          event: 'driver_assigned', audience: 'driver',
          orderId: action.orderId, title: 'New delivery assigned',
          body: `Order ${action.orderId} — ${order.pickup.address.split(',')[0]} → ${order.dropoff.address.split(',')[0]}`,
          driverId: driver.id,
        }),
      ])
      break
    }

    case 'UNASSIGN_DRIVER': {
      const order         = snapshot.orders.find(o => o.id === action.orderId)
      const driverToReset = order?.assignedDriverId ?? action.driverId
      const prevDriverName = driverToReset
        ? snapshot.drivers.find(d => d.id === driverToReset)?.name ?? 'driver'
        : 'driver'
      const auditNote: AdminNote = {
        id: `audit-${Date.now()}`,
        text: `🔧 ${adminLabel}: Unassigned ${prevDriverName} — order returned to New.`,
        authorName: 'System', createdAt: now,
      }
      const calls: Promise<any>[] = [
        q(supabase.from('orders').update({
          status: 'new', assigned_driver_id: null,
          assigned_driver_name: null, updated_at: now,
          notes: [...(order?.notes ?? []), auditNote],
        }).eq('id', action.orderId)),
      ]
      if (driverToReset) {
        calls.push(q(supabase.from('drivers').update({
          status: 'available', current_order_id: null,
        }).eq('id', driverToReset)))
      }
      await Promise.all(calls)
      break
    }

    case 'UPDATE_ORDER_STATUS': {
      const order = snapshot.orders.find(o => o.id === action.orderId)
      if (!order) return

      const statusAuditNote: AdminNote = {
        id: `audit-${Date.now()}`,
        text: `🔧 ${adminLabel}: Status manually set to "${action.status}".`,
        authorName: 'System', createdAt: now,
      }
      await supabase.from('orders').update({
        status: action.status, updated_at: now,
        notes: [...order.notes, statusAuditNote],
      }).eq('id', action.orderId)

      const notifMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
        picked_up:  { title: 'Parcel picked up', body: `Your parcel is on the way to ${order.dropoff.name}.` },
        in_transit: { title: 'Out for delivery', body: 'Your parcel is on the way — ETA soon.' },
        delivered:  { title: 'Delivered! 🎉',    body: `Your parcel was delivered to ${order.dropoff.name}.` },
        cancelled:  { title: 'Order cancelled',  body: `Order ${action.orderId} has been cancelled.` },
      }
      const notifData = notifMap[action.status]
      if (notifData) {
        await pushNotification({
          event: action.status as any, audience: 'customer',
          orderId: action.orderId, ...notifData,
          customerId: order.customerId, driverId: order.assignedDriverId,
        })
      }

      if (action.status === 'delivered') {
        const promises: Promise<any>[] = []
        if (order.assignedDriverId) {
          const driver = snapshot.drivers.find(d => d.id === order.assignedDriverId)
          promises.push(
            q(supabase.from('drivers').update({
              status: 'available', current_order_id: null,
              completed_orders: (driver?.completedOrders ?? 0) + 1,
            }).eq('id', order.assignedDriverId))
          )
        }
        const alreadyExists = snapshot.receipts.some(r => r.orderId === action.orderId)
        if (!alreadyExists) {
          const receipt: Receipt = {
            id:            `RCP-${String(snapshot.receipts.length + 1).padStart(3, '0')}`,
            orderId:       order.id, customerId: order.customerId,
            customerName:  order.customerName,
            amount:        order.priceBreakdown.subtotalPreTax,
            tax:           order.priceBreakdown.totalTax,
            tip:           order.priceBreakdown.tip,
            total:         order.priceBreakdown.total,
            paymentMethod: 'card', last4: '4242', brand: 'visa', createdAt: now,
          }
          promises.push(insertReceipt(receipt))
          promises.push(pushNotification({
            event: 'receipt_generated', audience: 'customer',
            orderId: action.orderId, title: 'Receipt available',
            body: `Your receipt for $${order.priceBreakdown.total.toFixed(2)} is ready.`,
            customerId: order.customerId,
          }))
        }
        await Promise.all(promises)
      }
      break
    }

    case 'CANCEL_ORDER': {
      const order = snapshot.orders.find(o => o.id === action.orderId)
      if (!order) return
      const cancelAuditNote: AdminNote = {
        id: `audit-${Date.now()}`,
        text: `🔧 ${adminLabel}: Order cancelled. Reason: ${action.reason || 'Not specified'}.`,
        authorName: 'System', createdAt: now,
      }
      const calls: Promise<any>[] = [
        q(supabase.from('orders').update({
          status: 'cancelled', cancel_reason: action.reason, updated_at: now,
          notes: [...order.notes, cancelAuditNote],
        }).eq('id', action.orderId)),
        pushNotification({
          event: 'cancelled', audience: 'customer',
          orderId: action.orderId, title: 'Order cancelled',
          body: action.reason || `Order ${action.orderId} has been cancelled.`,
          customerId: order.customerId,
        }),
      ]
      if (order.assignedDriverId) {
        calls.push(q(supabase.from('drivers').update({
          status: 'available', current_order_id: null,
        }).eq('id', order.assignedDriverId)))
      }
      await Promise.all(calls)
      break
    }

    case 'ADD_NOTE': {
      const order = snapshot.orders.find(o => o.id === action.orderId)
      if (!order) return
      // Cap at 50 notes to prevent unbounded JSONB growth
      const updatedNotes = [...order.notes, action.note].slice(-50)
      await supabase.from('orders').update({
        notes: updatedNotes, updated_at: now,
      }).eq('id', action.orderId)
      break
    }

    case 'CREATE_ORDER': {
      await supabase.from('orders').insert(orderToRow(action.order))
      await Promise.all([
        pushNotification({
          event: 'order_created', audience: 'customer',
          orderId: action.order.id, title: 'New delivery request',
          body: `Your delivery to ${action.order.dropoff.name} has been created.`,
          customerId: action.order.customerId,
        }),
        pushNotification({
          event: 'order_created', audience: 'admin',
          orderId: action.order.id, title: 'New order',
          body: `Order ${action.order.id} created by admin for ${action.order.customerName}.`,
        }),
      ])
      break
    }

    case 'ADD_DRIVER': {
      const d = action.driver
      await supabase.from('drivers').insert({
        id: d.id, name: d.name, initials: d.initials, phone: d.phone,
        email: d.email, vehicle: d.vehicle, status: d.status,
        rating: d.rating, completed_orders: d.completedOrders, joined_at: d.joinedAt,
      })
      break
    }

    case 'UPDATE_DRIVER': {
      const p = action.patch
      const dbPatch: Record<string, any> = {}
      if (p.name            !== undefined) dbPatch.name             = p.name
      if (p.initials        !== undefined) dbPatch.initials         = p.initials
      if (p.phone           !== undefined) dbPatch.phone            = p.phone
      if (p.email           !== undefined) dbPatch.email            = p.email
      if (p.vehicle         !== undefined) dbPatch.vehicle          = p.vehicle
      if (p.status          !== undefined) dbPatch.status           = p.status
      if (p.currentOrderId  !== undefined) dbPatch.current_order_id = p.currentOrderId ?? null
      if (p.rating          !== undefined) dbPatch.rating           = p.rating
      if (p.completedOrders !== undefined) dbPatch.completed_orders = p.completedOrders
      if (Object.keys(dbPatch).length > 0) {
        await supabase.from('drivers').update(dbPatch).eq('id', action.driverId)
      }
      break
    }

    case 'UPDATE_CITY_CONFIG': {
      const cfg = snapshot.cityConfigs.find(c => c.cityId === action.cityId)
      if (cfg) await saveCityConfig({ ...cfg, ...action.patch })
      break
    }

    case 'RESET_CITY_CONFIGS':
      await saveAllCityConfigs(getSystemCityConfigs())
      break

    case 'ADD_INCIDENT':
      await addIncident(action.incident)
      break

    case 'UPDATE_INCIDENT':
      await dbUpdateIncident(action.id, action.patch)
      break

    default: break
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState)

  // Snapshot ref so side-effects always see the state at dispatch time
  const snapshotRef = React.useRef<AdminState>(state)
  useEffect(() => { snapshotRef.current = state }, [state])

  // Wrapped dispatch: optimistic local update + async Supabase sync
  const dispatch = useCallback((action: Action) => {
    const snapshot = snapshotRef.current
    baseDispatch(action)
    syncToSupabase(action, snapshot).catch(err =>
      console.error('[AdminContext] syncToSupabase error', err),
    )
  }, [])

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [orders, receipts, incidents, configs, profiles] = await Promise.all([
          fetchOrders(),
          fetchReceipts(),
          fetchIncidents(),
          fetchCityConfigs(),
          fetchProfiles('customer'),
        ])
        if (cancelled) return

        // Build User[] from profiles — orderIds derived from loaded orders
        const users: User[] = profiles.map(p => ({
          ...p,
          orderIds: orders
            .filter(o => o.customerId === p.id)
            .map(o => o.id),
        }))

        baseDispatch({ type: '_HYDRATE_ORDERS',    orders    })
        baseDispatch({ type: '_HYDRATE_USERS',     users     })
        baseDispatch({ type: '_HYDRATE_RECEIPTS',  receipts  })
        baseDispatch({ type: '_HYDRATE_INCIDENTS', incidents })
        baseDispatch({ type: '_HYDRATE_CONFIGS',   configs   })

        if (isSupabaseConfigured) {
          const { data: driverRows } = await supabase
            .from('drivers')
            .select('*')
            .order('joined_at', { ascending: true })
          if (!cancelled && driverRows) {
            const drivers: Driver[] = driverRows.map((r: any) => ({
              id:              r.id,
              name:            r.name,
              initials:        r.initials,
              phone:           r.phone,
              email:           r.email,
              vehicle:         r.vehicle,
              status:          r.status,
              currentOrderId:  r.current_order_id ?? undefined,
              rating:          Number(r.rating),
              completedOrders: r.completed_orders,
              offersReceived:  r.offers_received ?? 0,
              offersDeclined:  r.offers_declined ?? 0,
              joinedAt:        r.joined_at,
            }))
            baseDispatch({ type: '_HYDRATE_DRIVERS', drivers })
          }
        }
      } catch (err) {
        console.error('[AdminContext] initial load error', err)
        if (cancelled) return
        baseDispatch({ type: '_HYDRATE_ORDERS',   orders:    getSharedOrders()    })
        baseDispatch({ type: '_HYDRATE_RECEIPTS',  receipts:  getSharedReceipts()  })
        baseDispatch({ type: '_HYDRATE_INCIDENTS', incidents: getSharedIncidents() })
        baseDispatch({ type: '_HYDRATE_CONFIGS',   configs:   getSystemCityConfigs() })
      }
      if (!cancelled) baseDispatch({ type: '_SET_LOADING', value: false })
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubOrders = subscribeToOrders(
      (order) => baseDispatch({ type: '_UPSERT_ORDER', order }),
      (order) => baseDispatch({ type: '_UPSERT_ORDER', order }),
      (_id)   => { /* deletions not shown in UI */ },
    )

    const unsubIncidents = subscribeToIncidents(
      (incident) => baseDispatch({ type: '_UPSERT_INCIDENT', incident }),
      (incident) => baseDispatch({ type: '_UPSERT_INCIDENT', incident }),
    )

    const unsubReceipts = subscribeToReceipts((_receipt) => {
      fetchReceipts().then(receipts =>
        baseDispatch({ type: '_HYDRATE_RECEIPTS', receipts }),
      )
    })

    const unsubConfigs = subscribeToCityConfigs((config) => {
      baseDispatch({ type: 'UPDATE_CITY_CONFIG', cityId: config.cityId, patch: config })
    })

    // Legacy StorageEvent listener (when Supabase is not configured)
    const legacyHandler = (e: StorageEvent) => {
      if (isSupabaseConfigured) return
      if (e.key === ORDERS_STORAGE_KEY && e.newValue) {
        try {
          const orders = JSON.parse(e.newValue) as Order[]
          if (Array.isArray(orders)) baseDispatch({ type: '_HYDRATE_ORDERS', orders })
        } catch {}
      }
    }
    window.addEventListener('storage', legacyHandler)

    return () => {
      unsubOrders()
      unsubIncidents()
      unsubReceipts()
      unsubConfigs()
      window.removeEventListener('storage', legacyHandler)
    }
  }, [])

  // ── localStorage fallback sync (no Supabase) ───────────────────────────────
  useEffect(() => {
    if (isSupabaseConfigured) return
    setSystemCityConfigs(state.cityConfigs)
  }, [state.cityConfigs])

  useEffect(() => {
    if (isSupabaseConfigured) return
    setSharedOrders(state.orders)
  }, [state.orders])

  useEffect(() => {
    if (isSupabaseConfigured) return
    setSharedReceipts(state.receipts)
  }, [state.receipts])

  useEffect(() => {
    if (isSupabaseConfigured) return
    setSharedIncidents(state.incidents)
  }, [state.incidents])

  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminStore() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdminStore must be used inside AdminProvider')
  return ctx
}
