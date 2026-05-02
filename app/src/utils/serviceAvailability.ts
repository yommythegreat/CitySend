/**
 * Service availability utilities.
 *
 * All city-level decisions (can order? pricing? taxes?) flow through
 * these functions.  Screens import from here — never from cityConfig
 * directly — so the config shape can evolve without touching screens.
 */

import { getSystemCityConfigs } from './configStore'
import type { CityConfig, CityPricing, TaxRates } from '../config/cityConfig'
import type { CityId } from '../types'

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Return the full config for a city by its stable ID.
 * Always reads from getSystemCityConfigs() so admin changes are reflected.
 * Falls back to the first registered city if ID is unrecognised (guards
 * against stale localStorage values).
 */
export function getCityConfig(cityId: CityId): CityConfig {
  const configs = getSystemCityConfigs()
  return configs.find(c => c.cityId === cityId) ?? configs[0]
}

/**
 * Find a city config by a raw geolocation-detected name.
 * Matches against each city's detectionAliases (lower-cased).
 * Returns undefined when the detected place is not a CitySend market.
 */
export function getCityConfigByDetectedName(rawName: string): CityConfig | undefined {
  const lower = rawName.toLowerCase().trim()
  return getSystemCityConfigs().find(c =>
    c.detectionAliases.some(alias => lower.includes(alias))
  )
}

// ── Availability ──────────────────────────────────────────────────────────────

/** True only if the city is currently serving customers. */
export function isCityLive(cityId: CityId): boolean {
  return getCityConfig(cityId).isLive
}

/**
 * True if an order can be started.
 * Currently equivalent to isCityLive, but centralised here so additional
 * runtime checks (service hours, maintenance mode, etc.) can be added later.
 */
export function canStartOrder(cityId: CityId): boolean {
  return getCityConfig(cityId).isLive
}

/** All cities that are currently accepting orders. */
export function getLiveCities(): CityConfig[] {
  return getSystemCityConfigs().filter(c => c.isLive)
}

/** All cities that are announced but not yet live. */
export function getComingSoonCities(): CityConfig[] {
  return getSystemCityConfigs().filter(c => !c.isLive)
}

/** Every registered city (live + coming-soon), in config order. */
export function getAllCities(): CityConfig[] {
  return getSystemCityConfigs()
}

/**
 * The name of the first live city (e.g. "Winnipeg").
 * Used in UI copy that refers to "the live city" without hardcoding a name.
 * Falls back to "an available city" if no city is live yet.
 */
export function getLiveCityName(): string {
  return getLiveCities()[0]?.cityName ?? 'an available city'
}

// ── Pricing & tax accessors ───────────────────────────────────────────────────

export function getPricingForCity(cityId: CityId): CityPricing {
  return getCityConfig(cityId).pricing
}

export function getTaxRatesForCity(cityId: CityId): TaxRates {
  return getCityConfig(cityId).taxRates
}

// ── Order price computation ───────────────────────────────────────────────────

export interface OrderPriceParams {
  cityConfig: CityConfig
  distKm: number
  parcelSize: 's' | 'm' | 'l'
  fragile: boolean
  tip?: number
}

export interface PriceBreakdown {
  /** Flat base delivery fee */
  baseFee: number
  /** Extra fee for distance beyond baseDistanceKm (0 when within base range) */
  distanceFee: number
  /** Size surcharge (0 for small) */
  sizeFee: number
  /** Fragile handling surcharge (0 when not fragile) */
  fragileFee: number
  /** Sum of baseFee + distanceFee + sizeFee + fragileFee */
  subtotalPreTax: number
  /** Federal GST amount (0 in HST provinces) */
  gst: number
  /** Provincial PST amount (0 where not applicable) */
  pst: number
  /** Harmonised Sales Tax (0 outside HST provinces) */
  hst: number
  /** Quebec Sales Tax (0 outside Quebec) */
  qst: number
  /** Total tax */
  totalTax: number
  /** subtotalPreTax + totalTax */
  subtotalWithTax: number
  /** Driver tip */
  tip: number
  /** Final amount charged */
  total: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Compute the full price breakdown for an order, using the city's
 * live pricing and tax rates.  All values are rounded to 2 decimal places.
 *
 * Screens should call this function — not derive prices inline.
 */
export function computeOrderPrice({
  cityConfig,
  distKm,
  parcelSize,
  fragile,
  tip = 0,
}: OrderPriceParams): PriceBreakdown {
  const { pricing, taxRates } = cityConfig

  // Distance surcharge
  const distanceFee = distKm > pricing.baseDistanceKm
    ? round2((distKm - pricing.baseDistanceKm) * pricing.extraKmFee)
    : 0

  // Size surcharge
  const sizeFee =
    parcelSize === 's' ? pricing.smallPackageFee :
    parcelSize === 'l' ? pricing.largePackageFee :
    pricing.mediumPackageFee

  // Fragile surcharge
  const fragileFee = fragile ? pricing.fragileFee : 0

  const subtotalPreTax = round2(pricing.baseFee + distanceFee + sizeFee + fragileFee)

  // Taxes applied to subtotalPreTax (not on tip)
  const gst = round2(subtotalPreTax * taxRates.gst)
  const pst = round2(subtotalPreTax * taxRates.pst)
  const hst = round2(subtotalPreTax * taxRates.hst)
  const qst = round2(subtotalPreTax * taxRates.qst)

  const totalTax        = round2(gst + pst + hst + qst)
  const subtotalWithTax = round2(subtotalPreTax + totalTax)
  const tipRounded      = round2(tip)
  const total           = round2(subtotalWithTax + tipRounded)

  return {
    baseFee: pricing.baseFee,
    distanceFee,
    sizeFee,
    fragileFee,
    subtotalPreTax,
    gst,
    pst,
    hst,
    qst,
    totalTax,
    subtotalWithTax,
    tip: tipRounded,
    total,
  }
}

/** Format a number as a CAD dollar string, e.g. "$14.00" */
export function fmtPrice(n: number): string {
  return `$${n.toFixed(2)}`
}
