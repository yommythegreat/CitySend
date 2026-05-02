/**
 * Shared service-availability and pricing utilities.
 * Used by admin, customer (future), and driver apps.
 * No UI dependencies — pure logic only.
 *
 * All city lookups go through getSystemCityConfigs() so that admin-managed
 * configuration (stored in localStorage during the MVP phase) is always
 * reflected rather than the compile-time defaults.
 */

import { getSystemCityConfigs } from './configStore'
import type { CityConfig, CityPricing, TaxRates } from '../config/cityConfig'
import type { CityId, PriceBreakdown } from '../types'

// ── City lookups ──────────────────────────────────────────────────────────────

export function getCityConfig(cityId: CityId): CityConfig {
  const configs = getSystemCityConfigs()
  return configs.find(c => c.cityId === cityId) ?? configs[0]
}

export function getAllCities(): CityConfig[]        { return getSystemCityConfigs() }
export function getLiveCities(): CityConfig[]       { return getSystemCityConfigs().filter(c => c.isLive) }
export function getComingSoonCities(): CityConfig[] { return getSystemCityConfigs().filter(c => !c.isLive) }
export function getLiveCityName(): string           { return getLiveCities()[0]?.cityName ?? 'an available city' }
export function isCityLive(cityId: CityId): boolean { return getCityConfig(cityId).isLive }
export function canStartOrder(cityId: CityId): boolean { return getCityConfig(cityId).isLive }
export function getPricingForCity(cityId: CityId): CityPricing { return getCityConfig(cityId).pricing }
export function getTaxRatesForCity(cityId: CityId): TaxRates   { return getCityConfig(cityId).taxRates }

// ── Price computation ─────────────────────────────────────────────────────────

export interface OrderPriceParams {
  cityConfig: CityConfig
  distKm: number
  parcelSize: 's' | 'm' | 'l'
  fragile: boolean
  tip?: number
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

export function computeOrderPrice({
  cityConfig, distKm, parcelSize, fragile, tip = 0,
}: OrderPriceParams): PriceBreakdown {
  const { pricing, taxRates } = cityConfig

  const distanceFee = distKm > pricing.baseDistanceKm
    ? round2((distKm - pricing.baseDistanceKm) * pricing.extraKmFee)
    : 0

  const sizeFee =
    parcelSize === 's' ? pricing.smallPackageFee :
    parcelSize === 'l' ? pricing.largePackageFee :
    pricing.mediumPackageFee

  const fragileFee     = fragile ? pricing.fragileFee : 0
  const subtotalPreTax = round2(pricing.baseFee + distanceFee + sizeFee + fragileFee)

  const gst = round2(subtotalPreTax * taxRates.gst)
  const pst = round2(subtotalPreTax * taxRates.pst)
  const hst = round2(subtotalPreTax * taxRates.hst)
  const qst = round2(subtotalPreTax * taxRates.qst)

  const totalTax        = round2(gst + pst + hst + qst)
  const subtotalWithTax = round2(subtotalPreTax + totalTax)
  const tipRounded      = round2(tip)

  return {
    baseFee: pricing.baseFee, distanceFee, sizeFee, fragileFee,
    subtotalPreTax, gst, pst, hst, qst,
    totalTax, subtotalWithTax, tip: tipRounded,
    total: round2(subtotalWithTax + tipRounded),
  }
}
