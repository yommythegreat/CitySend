/**
 * CitySend — shared data models.
 * Imported by every app (admin, customer, driver) and by shared utils.
 * No UI code here; pure TypeScript types only.
 */

// ── City ──────────────────────────────────────────────────────────────────────

export type CityId =
  | 'winnipeg'
  | 'toronto'
  | 'calgary'
  | 'vancouver'
  | 'edmonton'
  | 'ottawa'
  | 'montreal'

// ── Order ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'scheduled' // Morning/Evening order booked, waiting for its delivery window
  | 'preparing' // admin is getting the scheduled order ready to dispatch
  | 'new'       // in the assignable pool ("Finding Driver")
  | 'offered'   // admin assigned a driver; waiting for driver to accept
  | 'assigned'  // driver accepted
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  scheduled:  'Scheduled',
  preparing:  'Preparing',
  new:        'New',
  offered:    'Pending Accept',
  assigned:   'Assigned',
  picked_up:  'Picked Up',
  in_transit: 'In Transit',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

/** Valid next statuses for a given current status (admin workflow). */
export const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  scheduled:  ['preparing', 'cancelled'],
  preparing:  ['new', 'cancelled'],       // → new = "Dispatch" (enters assignable pool)
  new:        ['offered', 'assigned', 'cancelled'],
  offered:    ['assigned', 'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
}

export interface ContactInfo {
  name: string
  phone: string
  address: string
  unit?: string
  note?: string
  lat?: number
  lng?: number
}

export interface ParcelInfo {
  size: 's' | 'm' | 'l'
  desc: string
  fragile: boolean
  prohibitedItemsDeclarationAccepted?: boolean
  prohibitedItemsDeclarationAcceptedAt?: string
  /** Customer-chosen delivery window. Rides in the parcel JSONB (no migration).
   *  'express' = ASAP dispatch at flat rate. Absent on pre-feature orders. */
  deliveryWindow?: 'morning' | 'evening' | 'express'
}

/** Display labels for ParcelInfo.deliveryWindow (admin + driver surfaces).
 *  Times must match DELIVERY_WINDOWS in app/src/config/cityConfig.ts. */
export const DELIVERY_WINDOW_LABELS: Record<'morning' | 'evening' | 'express', string> = {
  morning: 'Morning · 10 AM – 2 PM',
  evening: 'Evening · 6 PM – 10 PM',
  express: 'Express · ASAP',
}

export interface PriceBreakdown {
  baseFee: number
  distanceFee: number
  sizeFee: number
  fragileFee: number
  subtotalPreTax: number
  gst: number
  pst: number
  hst: number
  qst: number
  totalTax: number
  subtotalWithTax: number
  tip: number
  total: number
}

export interface AdminNote {
  id: string
  text: string
  authorName: string
  createdAt: string
}

export type DeliveryType = 'express' | 'morning' | 'evening'

export interface Order {
  id: string
  customerId: string
  customerName: string   // denormalised for list display
  pickup: ContactInfo
  dropoff: ContactInfo
  parcel: ParcelInfo
  status: OrderStatus
  assignedDriverId?: string
  assignedDriverName?: string  // denormalised
  priceBreakdown: PriceBreakdown
  cityId: CityId
  distanceKm: number
  createdAt: string
  updatedAt: string
  notes: AdminNote[]
  cancelReason?: string
  /** 4-digit numeric code generated at booking; shown to recipient for driver handoff verification */
  handoffCode?: string
  /** Authoritative delivery type (DB column, not derived from parcel text). */
  deliveryType?: DeliveryType
  /** Scheduled window bounds (ISO). Null/absent for express. */
  deliveryWindowStart?: string
  deliveryWindowEnd?: string
}

/** True when the order is a scheduled (Morning/Evening) delivery rather than
 *  Express. Falls back to the parcel mirror for orders written before the
 *  delivery_type column existed. */
export function isScheduledDelivery(o: {
  deliveryType?: DeliveryType
  parcel?: { deliveryWindow?: 'morning' | 'evening' | 'express' }
}): boolean {
  const t = o.deliveryType ?? o.parcel?.deliveryWindow
  return t === 'morning' || t === 'evening'
}

/** Order statuses that count as "scheduled / pre-dispatch". */
export const PRE_DISPATCH_STATUSES: OrderStatus[] = ['scheduled', 'preparing']

// ── Driver ────────────────────────────────────────────────────────────────────

export type DriverStatus = 'available' | 'busy' | 'offline' | 'suspended'

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: 'Available',
  busy:      'Busy',
  offline:   'Offline',
  suspended: 'Suspended',
}

export interface Driver {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  vehicle: string
  status: DriverStatus
  currentOrderId?: string
  rating: number
  completedOrders: number
  offersReceived?: number
  offersDeclined?: number
  joinedAt: string
}

// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin' | 'driver'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  cityId: CityId
  orderIds: string[]
  createdAt: string
}

// ── Incident Report ───────────────────────────────────────────────────────────

export type IncidentSource   = 'customer' | 'driver' | 'admin'
export type IncidentStatus   = 'new' | 'in_review' | 'resolved' | 'escalated' | 'closed'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  new:        'New',
  in_review:  'In Review',
  resolved:   'Resolved',
  escalated:  'Escalated',
  closed:     'Closed',
}

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
}

export interface IncidentNote {
  id:         string
  text:       string
  authorName: string
  createdAt:  string
}

export interface IncidentReport {
  id:          string
  orderId:     string
  source:      IncidentSource
  reporterId:  string   // customerId, driverId, or 'admin'
  reporterName:string
  category:    string
  description: string
  severity:    IncidentSeverity
  status:      IncidentStatus
  assignedTo?: string
  notes:       IncidentNote[]
  createdAt:   string
  updatedAt:   string
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationAudience = 'customer' | 'driver' | 'admin' | 'all'
export type NotificationEvent =
  | 'order_created'
  | 'preparing'          // scheduled order moved into Preparing (pre-dispatch)
  | 'driver_assigned'
  | 'driver_en_route'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'issue_reported'
  | 'receipt_generated'

export interface AppNotification {
  id:          string
  event:       NotificationEvent
  audience:    NotificationAudience
  orderId:     string
  title:       string
  body:        string
  customerId?: string
  driverId?:   string
  read:        boolean
  createdAt:   string
}

// ── Receipt ───────────────────────────────────────────────────────────────────

export interface Receipt {
  id: string
  orderId: string
  customerId: string
  customerName: string
  amount: number       // subtotalPreTax
  tax: number          // totalTax
  tip: number
  total: number
  paymentMethod: string
  last4: string
  brand: 'visa' | 'mastercard' | 'amex'
  createdAt: string
}
