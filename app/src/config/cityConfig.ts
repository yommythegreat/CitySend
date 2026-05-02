/**
 * CitySend city configuration registry.
 *
 * Every deployable market is defined here.  To add a new city:
 *   1. Add its CityId to the union in src/types/index.ts
 *   2. Add a CityConfig entry to CITY_CONFIGS below
 *   3. Set isLive: true when ready to go live
 *
 * Screens should NEVER hard-code city names or prices.
 * Always read from getCityConfig() / serviceAvailability utils.
 */

import type { CityId } from '../types'

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface CityPricing {
  /** Flat fee covering trips up to baseDistanceKm */
  baseFee: number
  /** Maximum km covered by baseFee */
  baseDistanceKm: number
  /** Cost per km beyond baseDistanceKm */
  extraKmFee: number
  /** Surcharge added for small parcels (usually 0) */
  smallPackageFee: number
  /** Surcharge added for medium parcels */
  mediumPackageFee: number
  /** Surcharge added for large parcels */
  largePackageFee: number
  /** Surcharge added when parcel is marked fragile */
  fragileFee: number
  /** ISO 4217 currency code */
  currency: 'CAD'
}

// ── Taxes ─────────────────────────────────────────────────────────────────────

export interface TaxRates {
  /** Federal GST (e.g. 0.05 = 5%) */
  gst: number
  /** Provincial PST (0 in HST provinces) */
  pst: number
  /** Harmonised Sales Tax — replaces GST+PST in ON, NB, NS, NL, PEI */
  hst: number
  /** Quebec Sales Tax */
  qst: number
}

// ── Service hours ─────────────────────────────────────────────────────────────

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface ServiceHours {
  /** 24-h "HH:MM" local time */
  open: string
  close: string
  /** IANA timezone identifier */
  timezone: string
  /** Days the service operates */
  daysActive: Weekday[]
}

// ── Delivery rules ────────────────────────────────────────────────────────────

export interface DeliveryRules {
  maxWeightKg: number
  /** [length, width, height] in centimetres */
  maxDimensionsCm: [number, number, number]
  proofOfDeliveryRequired: boolean
  signatureRequired: boolean
  ageVerificationAvailable: boolean
}

// ── Cancellation & refund rules ───────────────────────────────────────────────

export interface CancellationRules {
  /** Minutes after order placement during which cancellation is free */
  freeWindowMinutes: number
  /** Percentage of order total refunded when cancelled before driver picks up (0–100) */
  refundPctBeforePickup: number
  /** Whether any refund is possible after the driver has picked up the parcel */
  allowRefundAfterPickup: boolean
  /** Percentage refunded if cancellation is allowed after pickup (0–100) */
  refundPctAfterPickup: number
  /** Whether customers must provide a reason when cancelling */
  requireReason: boolean
}

// ── Root config ───────────────────────────────────────────────────────────────

export type LaunchStatus = 'live' | 'coming-soon'

export interface CityConfig {
  cityId: CityId
  cityName: string
  province: string
  country: string
  isLive: boolean
  launchStatus: LaunchStatus
  serviceHours: ServiceHours
  pricing: CityPricing
  taxRates: TaxRates
  supportedPackageSizes: ('s' | 'm' | 'l')[]
  deliveryRules: DeliveryRules
  cancellationRules: CancellationRules
  /** Human-readable notes about coverage area */
  coverageNotes: string
  /**
   * Lower-cased strings that Nominatim reverse-geocode results
   * may return for this city. Used for automatic city detection.
   */
  detectionAliases: string[]

  // ── Geocoding ──────────────────────────────────────────────────────────────
  /**
   * Nominatim viewbox string (minLng,minLat,maxLng,maxLat) used to bias
   * address autocomplete results to this city's boundaries.
   */
  geocodeBbox: string
  /**
   * City + province string appended to Nominatim search queries to improve
   * result relevance (e.g. "Toronto, ON, Canada").
   */
  geocodeContext: string

  // ── Map ────────────────────────────────────────────────────────────────────
  /**
   * [lat, lng] — fallback map centre used before route coordinates are loaded.
   */
  mapCenter: [number, number]

  // ── Operational stats (shown in trust strip for live cities) ───────────────
  /** Typical driver dispatch-to-pickup time in minutes. */
  avgPickupMinutes: number
  /** On-time delivery rate, formatted for display (e.g. "98.4%"). */
  onTimePercent: string
}

// ── Registry ──────────────────────────────────────────────────────────────────

const ALL_WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const DEFAULT_CANCELLATION: CancellationRules = {
  freeWindowMinutes:      5,
  refundPctBeforePickup:  80,
  allowRefundAfterPickup: false,
  refundPctAfterPickup:   0,
  requireReason:          true,
}

const DEFAULT_RULES: DeliveryRules = {
  maxWeightKg: 15,
  maxDimensionsCm: [60, 45, 45],
  proofOfDeliveryRequired: true,
  signatureRequired: false,
  ageVerificationAvailable: false,
}

/** Placeholder pricing for coming-soon cities (not shown to users yet) */
const PLACEHOLDER_PRICING: CityPricing = {
  baseFee: 14,
  baseDistanceKm: 10,
  extraKmFee: 1.75,
  smallPackageFee: 0,
  mediumPackageFee: 2,
  largePackageFee: 4,
  fragileFee: 2,
  currency: 'CAD',
}

export const CITY_CONFIGS: CityConfig[] = [
  // ── Winnipeg (LIVE) ─────────────────────────────────────────────────────────
  {
    cityId: 'winnipeg',
    cityName: 'Winnipeg',
    province: 'Manitoba',
    country: 'Canada',
    isLive: true,
    launchStatus: 'live',
    serviceHours: {
      open: '08:00',
      close: '22:00',
      timezone: 'America/Winnipeg',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: {
      baseFee: 14.00,
      baseDistanceKm: 10,
      extraKmFee: 1.75,
      smallPackageFee: 0,
      mediumPackageFee: 2.00,
      largePackageFee: 4.00,
      fragileFee: 2.00,
      currency: 'CAD',
    },
    taxRates: {
      gst: 0.05,   // 5% federal
      pst: 0.07,   // 7% Manitoba PST
      hst: 0,
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Full coverage across Winnipeg and surrounding areas including St. Vital, St. James, Transcona, and River Heights.',
    detectionAliases: ['winnipeg'],
    geocodeBbox:    '-97.45,49.77,-96.95,50.05',
    geocodeContext: 'Winnipeg, MB, Canada',
    mapCenter:      [49.8951, -97.1384],
    avgPickupMinutes: 12,
    onTimePercent:    '98.4%',
  },

  // ── Toronto (COMING SOON) ───────────────────────────────────────────────────
  {
    cityId: 'toronto',
    cityName: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '07:00',
      close: '23:00',
      timezone: 'America/Toronto',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0,
      pst: 0,
      hst: 0.13,   // 13% Ontario HST
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across downtown Toronto and inner suburbs.',
    detectionAliases: ['toronto'],
    geocodeBbox:    '-79.64,43.58,-79.12,43.86',
    geocodeContext: 'Toronto, ON, Canada',
    mapCenter:      [43.6532, -79.3832],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },

  // ── Calgary (COMING SOON) ───────────────────────────────────────────────────
  {
    cityId: 'calgary',
    cityName: 'Calgary',
    province: 'Alberta',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '08:00',
      close: '22:00',
      timezone: 'America/Edmonton',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0.05,   // 5% federal — Alberta has no PST
      pst: 0,
      hst: 0,
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across Calgary and Airdrie.',
    detectionAliases: ['calgary'],
    geocodeBbox:    '-114.27,50.84,-113.90,51.21',
    geocodeContext: 'Calgary, AB, Canada',
    mapCenter:      [51.0447, -114.0719],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },

  // ── Vancouver (COMING SOON) ─────────────────────────────────────────────────
  {
    cityId: 'vancouver',
    cityName: 'Vancouver',
    province: 'British Columbia',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '07:00',
      close: '23:00',
      timezone: 'America/Vancouver',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0.05,   // 5% federal
      pst: 0.07,   // 7% BC PST
      hst: 0,
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across Vancouver, North Vancouver, and Burnaby.',
    detectionAliases: ['vancouver'],
    geocodeBbox:    '-123.27,49.20,-122.99,49.35',
    geocodeContext: 'Vancouver, BC, Canada',
    mapCenter:      [49.2827, -123.1207],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },

  // ── Edmonton (COMING SOON) ──────────────────────────────────────────────────
  {
    cityId: 'edmonton',
    cityName: 'Edmonton',
    province: 'Alberta',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '08:00',
      close: '22:00',
      timezone: 'America/Edmonton',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0.05,   // Alberta GST only
      pst: 0,
      hst: 0,
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across Edmonton and St. Albert.',
    detectionAliases: ['edmonton'],
    geocodeBbox:    '-113.71,53.40,-113.27,53.72',
    geocodeContext: 'Edmonton, AB, Canada',
    mapCenter:      [53.5461, -113.4938],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },

  // ── Ottawa (COMING SOON) ────────────────────────────────────────────────────
  {
    cityId: 'ottawa',
    cityName: 'Ottawa',
    province: 'Ontario',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '08:00',
      close: '21:00',
      timezone: 'America/Toronto',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0,
      pst: 0,
      hst: 0.13,   // Ontario HST
      qst: 0,
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across Ottawa and Gatineau.',
    detectionAliases: ['ottawa', 'gatineau'],
    geocodeBbox:    '-75.95,45.26,-75.47,45.54',
    geocodeContext: 'Ottawa, ON, Canada',
    mapCenter:      [45.4215, -75.6972],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },

  // ── Montreal (COMING SOON) ──────────────────────────────────────────────────
  {
    cityId: 'montreal',
    cityName: 'Montréal',
    province: 'Quebec',
    country: 'Canada',
    isLive: false,
    launchStatus: 'coming-soon',
    serviceHours: {
      open: '08:00',
      close: '23:00',
      timezone: 'America/Toronto',
      daysActive: ALL_WEEKDAYS,
    },
    pricing: PLACEHOLDER_PRICING,
    taxRates: {
      gst: 0.05,      // 5% federal
      pst: 0,
      hst: 0,
      qst: 0.09975,   // Quebec QST
    },
    supportedPackageSizes: ['s', 'm', 'l'],
    deliveryRules: DEFAULT_RULES,
    cancellationRules: DEFAULT_CANCELLATION,
    coverageNotes: 'Planned coverage across the island of Montréal and Laval.',
    detectionAliases: ['montreal', 'montréal'],
    geocodeBbox:    '-73.98,45.41,-73.47,45.71',
    geocodeContext: 'Montreal, QC, Canada',
    mapCenter:      [45.5017, -73.5673],
    avgPickupMinutes: 15,
    onTimePercent:    '—',
  },
]
