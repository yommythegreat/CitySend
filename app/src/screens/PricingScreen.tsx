import React, { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Back, Lock, Clock } from '../components/Icons'
import { fmt } from '../utils/pricing'
import { computeOrderPrice } from '../utils/serviceAvailability'
import { fetchRoute, geocodeOnce } from '../hooks/useGeocoder'
import { DELIVERY_WINDOWS, resolveWindow } from '../config/cityConfig'
import type { CityConfig } from '../config/cityConfig'
import type { Draft, ScreenName, RouteInfo, DeliveryWindow } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  draft: Draft
  setDraft: (d: Draft) => void
  /** Injected by App.tsx — drives all pricing and tax calculations. */
  cityConfig: CityConfig
}

export function PricingScreen({ go, draft, setDraft, cityConfig }: Props) {
  const [routeInfo,    setRouteInfo]    = useState<RouteInfo | null>(draft.route ?? null)
  const [loading,      setLoading]      = useState(!draft.route)
  const [taxTipOpen, setTaxTipOpen] = useState<string | null>(null)

  const pickupAddr  = draft.pickup.address  || '134 Princess St, Exchange District'
  const dropoffAddr = draft.dropoff.address || '88 Osborne St, Osborne Village'
  const pickupName  = draft.pickup.name     || 'Sasha Novak'
  const dropoffName = draft.dropoff.name    || 'Mei Tanaka'
  const pickupPhone = draft.pickup.phone    || '204 555 0199'
  const dropoffPhone= draft.dropoff.phone   || '204 555 0148'
  const parcelSize  = draft.parcel.size === 's' ? 'Small' : draft.parcel.size === 'l' ? 'Large' : 'Medium'

  // Resolve route via OSRM if not already in draft
  useEffect(() => {
    if (draft.route) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const pu  = draft.pickup.lat  ? { lat: draft.pickup.lat,  lng: draft.pickup.lng! }  : await geocodeOnce(pickupAddr,  cityConfig)
      const do_ = draft.dropoff.lat ? { lat: draft.dropoff.lat, lng: draft.dropoff.lng! } : await geocodeOnce(dropoffAddr, cityConfig)
      if (cancelled) return
      if (pu && do_) {
        const route = await fetchRoute(pu, do_)
        if (!cancelled && route) { setRouteInfo(route); setDraft({ ...draft, route }) }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Distance in km (0 while loading — shows base price without distance surcharge)
  const distKm   = routeInfo ? routeInfo.distanceM / 1000 : 0
  const distKmFmt = routeInfo ? distKm.toFixed(1) : '—'
  const etaMins  = routeInfo ? Math.round(routeInfo.durationS / 60) + 12 : null
  const deliveryTime = etaMins
    ? new Date(Date.now() + etaMins * 60_000).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : '—'

  // Restored pre-feature drafts (sessionStorage) may lack deliveryWindow.
  const deliveryWindow: DeliveryWindow = draft.deliveryWindow ?? 'morning'
  const isExpress = deliveryWindow === 'express'

  // ── Compute price from city config ──────────────────────────────────────────
  const price = computeOrderPrice({
    cityConfig,
    distKm,
    parcelSize: draft.parcel.size,
    fragile: draft.parcel.fragile,
    tip: 0,
    deliveryWindow,
  })

  // Build line-item list — only show rows where the value is > 0
  const taxLabels: Record<string, string> = {
    gst: `GST (${(cityConfig.taxRates.gst * 100).toFixed(0)}%)`,
    pst: `PST (${(cityConfig.taxRates.pst * 100).toFixed(0)}%)`,
    hst: `HST (${(cityConfig.taxRates.hst * 100).toFixed(0)}%)`,
    qst: `QST (${(cityConfig.taxRates.qst * 100).toFixed(2)}%)`,
  }

  const TAX_TOOLTIP = 'Taxes are calculated based on your delivery city and applicable provincial/federal rates. Tip is not taxed.'

  const lineItems: { label: string; value: number; isTax?: boolean }[] = [
    { label: isExpress ? 'Express base fee' : 'Base delivery fee', value: price.baseFee },
    { label: 'Distance surcharge',     value: price.distanceFee  },
    { label: 'Size surcharge',         value: price.sizeFee      },
    { label: 'Fragile handling',       value: price.fragileFee   },
    { label: taxLabels.gst,            value: price.gst,   isTax: true },
    { label: taxLabels.pst,            value: price.pst,   isTax: true },
    { label: taxLabels.hst,            value: price.hst,   isTax: true },
    { label: taxLabels.qst,            value: price.qst,   isTax: true },
  ].filter(item => item.value > 0)

  return (
    <div className="cs-screen cs-enter-right">
      {/* Header */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('new-3')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Review</div>
      </div>

      {/* Price hero */}
      <div style={{ padding: '24px 20px 16px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {loading ? 'Calculating price…' : 'Price'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -2.5, color: 'var(--cs-ink)', lineHeight: 1, transition: 'all .3s' }}>
            {fmt(price.subtotalWithTax)}
          </div>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 13, color: 'var(--cs-slate-500)' }}>
            {cityConfig.pricing.currency} · before tip
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 10, lineHeight: 1.5 }}>
          {loading
            ? 'Fetching route — price updates when ready.'
            : `Same-day delivery in ${cityConfig.cityName}. Tip is added at checkout.`
          }
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Delivery window selector */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Delivery window
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {DELIVERY_WINDOWS.map(w => {
              const selected = deliveryWindow === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => setDraft({ ...draft, deliveryWindow: w.id })}
                  style={{
                    padding: '8px 6px',
                    border: `1.5px solid ${selected ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                    borderRadius: 12,
                    background: selected ? 'var(--cs-ink)' : '#fff',
                    color: selected ? '#fff' : 'var(--cs-ink)',
                    fontFamily: 'var(--cs-font)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{w.label}</span>
                  <span style={{ fontSize: 11, color: selected ? 'rgba(255,255,255,.75)' : 'var(--cs-slate-500)' }}>
                    {w.time}
                  </span>
                  {/* Date hint — a scheduled window that has passed today rolls to tomorrow */}
                  {w.id !== 'express' && (() => {
                    const r = resolveWindow(w.id, new Date())
                    return r.isToday ? null : (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: selected ? 'rgba(255,255,255,.9)' : 'var(--cs-accent)' }}>
                        {r.dateLabel}
                      </span>
                    )
                  })()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Route card */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--cs-slate-100)', padding: 18, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Clock size={16} color="var(--cs-slate-500)" />
            <div style={{ fontSize: 14, color: 'var(--cs-slate-700)' }}>
              Pickup in <b style={{ color: 'var(--cs-ink)' }}>~{cityConfig.avgPickupMinutes} min</b>
              {etaMins && <> · Delivered by <b style={{ color: 'var(--cs-ink)' }}>{deliveryTime}</b></>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--cs-ink)' }} />
              <div style={{ width: 2, flex: 1, background: 'var(--cs-slate-200)', marginTop: 2, marginBottom: 2, minHeight: 28 }} />
              <div style={{ width: 10, height: 10, background: 'var(--cs-accent)', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{pickupAddr}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{pickupName} · {pickupPhone}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Drop-off</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{dropoffAddr}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{dropoffName} · {dropoffPhone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Parcel + distance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 14 }}>
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Parcel</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 4 }}>
              {parcelSize}{draft.parcel.fragile ? ' · Fragile' : ''}
            </div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{draft.parcel.desc || 'Documents'}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 14 }}>
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Distance</div>
            {loading
              ? <div style={{ fontSize: 13, color: 'var(--cs-slate-400)', marginTop: 4 }}>Calculating…</div>
              : <>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 4 }}>{distKmFmt} km</div>
                  {etaMins && <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>~{etaMins} min total</div>}
                </>
            }
          </div>
        </div>

        {/* Price breakdown — only non-zero rows */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 16, marginBottom: 20 }}>
          {lineItems.map(({ label, value, isTax }, idx) => {
            const isOpen = taxTipOpen === label
            return (
            <div
              key={label}
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', fontSize: 14, color: 'var(--cs-slate-700)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, position: 'relative' }}>
                {label}
                {isTax && (
                  <>
                    <button
                      onClick={() => setTaxTipOpen(isOpen ? null : label)}
                      style={{
                        background: 'none', border: 'none', padding: '0 2px',
                        cursor: 'pointer', fontSize: 12,
                        color: isOpen ? 'var(--cs-ink)' : 'var(--cs-slate-400)',
                        lineHeight: 1, display: 'flex', alignItems: 'center',
                      }}
                      aria-label="Tax info"
                    >
                      ⓘ
                    </button>
                    {isOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, zIndex: 20,
                        marginTop: 6, width: 240,
                        background: 'var(--cs-ink)', color: '#fff',
                        fontSize: 12, lineHeight: 1.5,
                        padding: '10px 12px', borderRadius: 10,
                        boxShadow: '0 8px 24px -8px rgba(11,18,32,.35)',
                      }}>
                        {TAX_TOOLTIP}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div style={{ fontFamily: 'var(--cs-mono)' }}>{fmt(value)}</div>
            </div>
            )
          })}
          <div style={{
            borderTop: '1px solid var(--cs-slate-100)', marginTop: 10, paddingTop: 12,
            display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600,
          }}>
            <div>Subtotal (before tip)</div>
            <div style={{ fontFamily: 'var(--cs-mono)' }}>{fmt(price.subtotalWithTax)}</div>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff', flexShrink: 0 }}>
        <Button kind="ink" size="lg" full onClick={() => go('pay')} icon={<Lock color="#fff" size={16} />}>
          Continue to payment
        </Button>
      </div>
    </div>
  )
}
