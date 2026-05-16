import React, { useState, useEffect } from 'react'
import { LogoWordmark } from '../components/Logo'
import { IconButton } from '../components/IconButton'
import {
  Bell, User, Send, Arrow, Truck,
  Home as HomeIcon, Package, Pin, Chevron, ChevronDown, Plus, Check,
} from '../components/Icons'
import { getLiveCityName } from '../utils/serviceAvailability'
import { getCustomerOrders, subscribeToCustomerOrders, type CustomerOrder } from '../utils/orderStore'
import type { CityConfig } from '../config/cityConfig'
import type { AppState, AuthUser, CityId, NavOptions, ScreenName } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRelTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diffMs / 60_000)
  const hrs   = Math.floor(diffMs / 3_600_000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hrs   < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const TRACK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: 'Finding driver', color: '#c94a1b',              bg: '#FFF3EE' },
  assigned:   { label: 'Driver assigned', color: 'var(--cs-ink)',       bg: 'var(--cs-slate-100)' },
  picked_up:  { label: 'Picked up',       color: 'var(--cs-ink)',       bg: 'var(--cs-slate-100)' },
  in_transit: { label: 'In transit',      color: 'var(--cs-ink)',       bg: 'var(--cs-slate-100)' },
  delivered:  { label: 'Delivered',       color: '#167842',             bg: '#EDFAF3' },
  cancelled:  { label: 'Cancelled',       color: 'var(--cs-slate-500)', bg: 'var(--cs-slate-100)' },
}

function shortAddr(addr: string): string {
  // Return the first part of the address (before first comma)
  return addr.split(',')[0].trim()
}

interface Props {
  go: (screen: ScreenName, opts?: NavOptions) => void
  state: AppState
  user: AuthUser | null
  cityConfig: CityConfig
  configs: CityConfig[]
  onCityChange: (cityId: CityId) => void
}

// ── City picker sheet ─────────────────────────────────────────────────────────

function CityPickerSheet({
  currentCityId,
  onSelect,
  onClose,
  configs,
}: {
  currentCityId: CityId
  onSelect: (id: CityId) => void
  onClose: () => void
  configs: CityConfig[]
}) {
  const cities = configs

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 101, padding: '8px 0 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.12)',
        maxHeight: '75vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--cs-slate-200)', margin: '12px auto 20px',
        }} />

        <div style={{ padding: '0 20px 4px', fontSize: 17, fontWeight: 600, letterSpacing: -0.3, color: 'var(--cs-ink)' }}>
          Choose your city
        </div>
        <div style={{ padding: '2px 20px 16px', fontSize: 13, color: 'var(--cs-slate-500)' }}>
          Affects pricing, availability, and delivery areas.
        </div>

        {cities.map((c) => (
          <button
            key={c.cityId}
            onClick={() => { onSelect(c.cityId); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 14, padding: '14px 20px',
              background: 'transparent', border: 'none',
              cursor: c.isLive ? 'pointer' : 'default',
              fontFamily: 'var(--cs-font)', textAlign: 'left',
            }}
          >
            {/* Status dot */}
            <div style={{
              width: 10, height: 10, borderRadius: 5, flexShrink: 0,
              background: c.isLive ? 'var(--cs-ok)' : 'var(--cs-slate-300)',
            }} />

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 15, fontWeight: 500,
                color: c.isLive ? 'var(--cs-ink)' : 'var(--cs-slate-400)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {c.cityName}
                {!c.isLive && (
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--cs-mono)',
                    letterSpacing: 0.6, textTransform: 'uppercase',
                    color: 'var(--cs-slate-400)',
                    background: 'var(--cs-slate-100)',
                    padding: '2px 6px', borderRadius: 99,
                  }}>
                    Coming soon
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--cs-slate-400)', marginTop: 1 }}>
                {c.province}
              </div>
            </div>

            {/* Selected checkmark */}
            {c.cityId === currentCityId && (
              <Check size={15} color="var(--cs-ok)" />
            )}
          </button>
        ))}
      </div>
    </>
  )
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

export function HomeScreen({ go, state, user, cityConfig, configs, onCityChange }: Props) {
  const [showPicker,   setShowPicker]   = useState(false)
  const [trackOrders,  setTrackOrders]  = useState<CustomerOrder[]>([])
  const [trackLoading, setTrackLoading] = useState(false)

  // Load recent orders for Track Delivery section (initial fetch)
  useEffect(() => {
    if (!user || user.id === 'guest') return
    let cancelled = false
    setTrackLoading(true)
    getCustomerOrders(user.id).then(orders => {
      if (cancelled) return
      // Show last 7 days, active orders only (exclude delivered + cancelled), max 5 cards
      const cutoff = Date.now() - 7 * 86_400_000
      const recent = orders
        .filter(o => o.status !== 'cancelled' && o.status !== 'delivered' && new Date(o.createdAt).getTime() > cutoff)
        .slice(0, 5)
      setTrackOrders(recent)
      setTrackLoading(false)
    }).catch(() => { if (!cancelled) setTrackLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  // Realtime: keep order cards live so status changes from admin/driver
  // reflect instantly without a full refresh.
  useEffect(() => {
    if (!user || user.id === 'guest') return
    const cutoff = Date.now() - 7 * 86_400_000

    const unsub = subscribeToCustomerOrders(user.id, (updatedOrder) => {
      setTrackOrders(prev => {
        const exists = prev.some(o => o.id === updatedOrder.id)
        if (exists) {
          // Update in place — preserve list order
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        }
        // New order just arrived (e.g. created in another tab) — prepend if eligible
        if (
          updatedOrder.status !== 'cancelled' &&
          updatedOrder.status !== 'delivered' &&
          new Date(updatedOrder.createdAt).getTime() > cutoff
        ) {
          return [updatedOrder, ...prev].slice(0, 5)
        }
        return prev
      })
    })

    return unsub
  }, [user?.id])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const cityIsLive   = cityConfig.isLive
  const liveCityName = getLiveCityName(configs)

  const handleSendPackage = () => {
    // go() will gate on canStartOrder(); if not live it routes to city-blocked.
    go('new-1')
  }

  return (
    <div className="cs-screen cs-screen--paper cs-enter-left">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '52px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 102 }}>
        <LogoWordmark scale={0.58} />
        <div style={{ display: 'flex', gap: 8 }}>
          <IconButton onClick={() => go('notifications')} style={{ position: 'relative' }}>
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 8, right: 8, width: 7, height: 7,
              background: 'var(--cs-accent)', borderRadius: '50%',
              border: '1.5px solid var(--cs-paper)',
            }} />
          </IconButton>
          <IconButton onClick={() => go('profile')}>
            <User size={18} />
          </IconButton>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0' }}>
        {/* Greeting row + city chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
            {greeting}, {firstName}
          </div>

          {/* City chip */}
          <button
            onClick={() => setShowPicker(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px 5px 8px',
              background: '#fff', border: '1px solid var(--cs-slate-200)',
              borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--cs-font)',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: cityIsLive ? 'var(--cs-ok)' : 'var(--cs-slate-300)',
            }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cs-ink)' }}>
              {cityConfig.cityName}
            </span>
            <ChevronDown size={11} color="var(--cs-slate-400)" />
          </button>
        </div>

        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.05, marginTop: 4, color: 'var(--cs-ink)' }}>
          {cityIsLive
            ? <>Across town,<br />before dawn.</>
            : <>Coming soon<br />to {cityConfig.cityName}.</>
          }
        </div>
        <div style={{ fontSize: 15, color: 'var(--cs-slate-500)', marginTop: 12, lineHeight: 1.45 }}>
          {cityIsLive
            ? `Same-day delivery anywhere in ${cityConfig.cityName}. Tap below to send anything that fits in a car.`
            : `CitySend is launching in ${cityConfig.cityName}, ${cityConfig.province} soon. Switch to ${liveCityName} to place orders now.`
          }
        </div>
      </div>

      {/* ── Primary CTA ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 20px' }}>
        <button
          onClick={handleSendPackage}
          style={{
            width: '100%', padding: 20, border: 'none', cursor: 'pointer',
            background: cityIsLive ? 'var(--cs-ink)' : 'var(--cs-slate-300)',
            color: '#fff', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: cityIsLive ? '0 10px 30px -10px rgba(11,18,32,.5)' : 'none',
            textAlign: 'left', transition: 'background .2s',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: cityIsLive ? 'var(--cs-accent)' : 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Send size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>
              {cityIsLive ? 'Send a package' : `Coming soon in ${cityConfig.cityName}`}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
              {cityIsLive ? 'Avg. pickup in 30 min' : 'Join the waitlist →'}
            </div>
          </div>
          <Arrow color="#fff" />
        </button>
      </div>

      {/* ── Track Delivery (live orders from Supabase) ──────────────────────── */}
      {cityIsLive && user && user.id !== 'guest' && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Track delivery
            </div>
            {trackOrders.length > 0 && (
              <button onClick={() => go('history')} style={{ fontSize: 13, color: 'var(--cs-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                View all
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {trackLoading && (
            <div style={{ display: 'flex', gap: 12 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ width: 220, height: 110, flexShrink: 0, borderRadius: 16, background: 'var(--cs-slate-100)', opacity: 0.6 }} />
              ))}
            </div>
          )}

          {/* Order cards */}
          {!trackLoading && trackOrders.length > 0 && (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
              {trackOrders.map((order) => {
                const chip = TRACK_STATUS[order.status] ?? TRACK_STATUS['new']
                const isActive = order.status !== 'delivered' && order.status !== 'cancelled'
                return (
                  <button
                    key={order.id}
                    onClick={() => go('tracking', { trackOrderId: order.id })}
                    style={{
                      width: 220, flexShrink: 0, textAlign: 'left', cursor: 'pointer',
                      background: '#fff', border: '1px solid var(--cs-slate-100)',
                      borderRadius: 16, padding: 16, fontFamily: 'var(--cs-font)',
                    }}
                  >
                    {/* Status chip + ID row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
                        color: chip.color, background: chip.bg,
                        padding: '3px 8px', borderRadius: 99,
                      }}>
                        {isActive && <Truck size={11} color={chip.color} />}
                        {!isActive && <Check size={11} color={chip.color} />}
                        {chip.label}
                      </span>
                      <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-400)', letterSpacing: 0.5 }}>
                        {order.id}
                      </span>
                    </div>
                    {/* Route */}
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.1 }}>
                      {shortAddr(order.pickup.address)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '3px 0' }}>
                      <div style={{ width: 12, height: 1, background: 'var(--cs-slate-300)' }} />
                      <Arrow size={10} color="var(--cs-slate-400)" />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--cs-slate-600)' }}>
                      {shortAddr(order.dropoff.address)}
                    </div>
                    {/* Last updated */}
                    <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-400)', marginTop: 10 }}>
                      {fmtRelTime(order.updatedAt)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!trackLoading && trackOrders.length === 0 && (
            <div style={{
              padding: '20px 16px', borderRadius: 16,
              background: '#fff', border: '1px solid var(--cs-slate-100)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cs-ink)', marginBottom: 4 }}>
                No deliveries to track yet
              </div>
              <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', lineHeight: 1.4 }}>
                When you create a delivery, it will appear here.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Saved places ───────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Saved places
        </div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
          {state.savedAddresses.length === 0 && (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', marginBottom: 6 }}>
                No saved places yet
              </div>
              <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', lineHeight: 1.5, marginBottom: 14 }}>
                Add your first pickup or drop-off location to make future deliveries faster.
              </div>
              <button
                onClick={() => go('add-place')}
                style={{
                  background: 'var(--cs-ink)', color: '#fff', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 600,
                  padding: '10px 22px', borderRadius: 10,
                }}
              >
                Add a place
              </button>
            </div>
          )}

          {state.savedAddresses.map((a, i) => (
            <button
              key={i}
              onClick={() => go('new-1')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--cs-font)', borderRadius: 0,
                ...(i > 0 ? { borderTop: '1px solid var(--cs-slate-100)' } : {}),
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {a.icon === 'home' ? <HomeIcon size={16} /> : a.icon === 'package' ? <Package size={16} /> : <Pin size={16} />}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{a.label}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{a.address}</div>
              </div>
              <Chevron size={14} color="var(--cs-slate-400)" />
            </button>
          ))}

          {/* Add a place — only shown when there are existing places */}
          {state.savedAddresses.length > 0 && (
            <button
              onClick={() => go('add-place')}
              style={{
                width: '100%', padding: '14px 16px', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                borderTop: '1px solid var(--cs-slate-100)', fontFamily: 'var(--cs-font)',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} />
              </div>
              <div style={{ fontSize: 15, color: 'var(--cs-slate-500)' }}>Add a place</div>
            </button>
          )}
        </div>
      </div>

      {/* ── Trust strip ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 100px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(cityIsLive
          ? [
              { k: 'Avg pickup', v: `${cityConfig.avgPickupMinutes} min` },
              { k: 'On-time',    v: cityConfig.onTimePercent             },
              { k: 'Base rate',  v: `$${cityConfig.pricing.baseFee.toFixed(0)}` },
            ]
          : [
              { k: 'Status',    v: 'Soon'  },
              { k: 'Province',  v: cityConfig.province.split(' ')[0] },
              { k: 'Country',   v: 'CA'   },
            ]
        ).map((s) => (
          <div key={s.k} style={{ padding: 14, background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{s.k}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cs-ink)', marginTop: 4, letterSpacing: -0.5 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── City picker sheet ───────────────────────────────────────────────── */}
      {showPicker && (
        <CityPickerSheet
          currentCityId={state.selectedCityId}
          onSelect={onCityChange}
          onClose={() => setShowPicker(false)}
          configs={configs}
        />
      )}
    </div>
  )
}
