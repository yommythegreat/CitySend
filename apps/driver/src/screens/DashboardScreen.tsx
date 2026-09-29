import React, { useState, useMemo, useEffect } from 'react'
import { useDriver } from '../store/DriverContext'
import type { DeliverySubstep } from '../store/DriverContext'
import type { Order } from '@shared/types'
import { driverPayout } from '../utils/payout'
import { Button, Card, Icon, SectionLabel, TextLink, money } from '../ui'
import { haptic } from '../lib/haptics'

interface Props {
  onSelectOrder: (orderId: string) => void
  onGoHistory:   () => void
  onGoProfile:   () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const street = (address: string) => address.split(',')[0]

function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24)  return `${hrs} h ago`
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Where the driver is in a job, and what the one button should say. */
function jobStage(order: Order, substep: DeliverySubstep | undefined) {
  if (substep === 'at_dropoff')                                   return { label: 'At drop-off',         action: 'Hand off the parcel' }
  if (substep === 'picked_up' || order.status === 'picked_up' ||
      order.status === 'in_transit')                              return { label: 'Heading to drop-off', action: 'Navigate to drop-off' }
  if (substep === 'at_pickup')                                    return { label: 'At pickup',           action: 'Confirm pickup' }
  return { label: 'Heading to pickup', action: 'Navigate to pickup' }
}

function windowLabel(order: Order): string | null {
  const t = order.deliveryType ?? order.parcel?.deliveryWindow
  if (!t) return null
  return t === 'express' ? 'Express' : t === 'morning' ? 'Morning' : t === 'evening' ? 'Evening' : t
}

const onlineKey = (driverId: string) => `cs_driver_online_${driverId}`

// ── Pieces ────────────────────────────────────────────────────────────────────

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'ok' }) {
  const tones = {
    neutral: { background: 'var(--d-surface-2)', color: 'var(--d-ink-2)' },
    accent:  { background: 'var(--d-accent-lt)', color: 'var(--d-accent)' },
    ok:      { background: 'var(--d-ok-bg)',     color: 'var(--d-ok)' },
  }[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 12,
      fontSize: 12, fontWeight: 600, letterSpacing: -0.1, whiteSpace: 'nowrap', ...tones,
    }}>{children}</span>
  )
}

function RouteLines({ order }: { order: Order }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr', columnGap: 12, rowGap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--d-ink)' }} />
        <span style={{ flex: 1, width: 2, background: 'var(--d-border)', margin: '4px 0 -14px' }} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--d-ink)' }}>{street(order.pickup.address)}</div>
        <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 1 }}>Pickup · {order.pickup.name}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--d-accent)' }} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--d-ink)' }}>{street(order.dropoff.address)}</div>
        <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 1 }}>Drop-off · {order.dropoff.name}</div>
      </div>
    </div>
  )
}

function StatusCard({ online, onToggle }: { online: boolean; onToggle: (next: boolean) => void }) {
  if (!online) {
    return (
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24, flexShrink: 0,
            background: 'var(--d-surface-2)', color: 'var(--d-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="power" size={22} stroke={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4 }}>You're offline</div>
            <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 2 }}>Go online to start getting delivery offers.</div>
          </div>
        </div>
        <Button variant="go" size="xl" icon="power" onClick={() => onToggle(true)}>Go online</Button>
      </Card>
    )
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'var(--d-ok)', opacity: .25, animation: 'd-ping 1.8s ease-out infinite' }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 24, background: 'var(--d-ok-bg)', color: 'var(--d-ok)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="bolt" size={22} stroke={2.2} />
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: -0.4 }}>You're online</div>
          <div style={{ fontSize: 14, color: 'var(--d-muted)', marginTop: 2 }}>We'll alert you when a job comes in.</div>
        </div>
      </div>
      <Button variant="secondary" size="md" onClick={() => onToggle(false)} style={{ marginTop: 16 }}>Go offline</Button>
    </Card>
  )
}

function CurrentJob({ order, substep, onOpen }: { order: Order; substep: DeliverySubstep | undefined; onOpen: () => void }) {
  const stage = jobStage(order, substep)
  const win = windowLabel(order)
  return (
    <Card style={{ padding: 20, borderColor: 'var(--d-accent)', boxShadow: 'var(--d-shadow-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Chip tone="accent">{stage.label}</Chip>
        {win && <Chip>{win}</Chip>}
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>{money(driverPayout(order))}</div>
          <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{order.distanceKm.toFixed(1)} km</div>
        </div>
      </div>
      <RouteLines order={order} />
      <Button size="xl" onClick={onOpen} style={{ marginTop: 20 }}>{stage.action}</Button>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 650, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function WeekChart({ days, total }: { days: { label: string; earnings: number; isToday: boolean }[]; total: number }) {
  const max = Math.max(...days.map(d => d.earnings), 1)
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--d-muted)' }}>Last 7 days</div>
        <div style={{ fontSize: 18, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 72 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: '100%', borderRadius: 6,
              height: d.earnings > 0 ? `${Math.max((d.earnings / max) * 100, 8)}%` : 4,
              background: d.isToday ? 'var(--d-accent)' : d.earnings > 0 ? 'var(--d-ink-2)' : 'var(--d-border)',
              opacity: d.isToday || d.earnings === 0 ? 1 : 0.35,
            }} />
            <div style={{ fontFamily: 'var(--d-mono)', fontSize: 10, color: d.isToday ? 'var(--d-ink)' : 'var(--d-muted-lt)' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function DashboardScreen({ onSelectOrder, onGoHistory, onGoProfile }: Props) {
  const { state, completedOrders, activeOrders, dispatch, connectionStatus } = useDriver()
  const { auth } = state

  const [online, setOnline] = useState(() => {
    if (!auth) return true
    try { return localStorage.getItem(onlineKey(auth.driverId)) !== 'false' } catch { return true }
  })
  useEffect(() => {
    if (!auth) return
    try { localStorage.setItem(onlineKey(auth.driverId), String(online)) } catch {}
  }, [online, auth?.driverId])

  const delivered = useMemo(() => completedOrders.filter(o => o.status === 'delivered'), [completedOrders])

  const today = useMemo(() => {
    const key = new Date().toDateString()
    const list = delivered.filter(o => new Date(o.updatedAt).toDateString() === key)
    return {
      count:    list.length,
      earnings: list.reduce((s, o) => s + driverPayout(o), 0),
      km:       list.reduce((s, o) => s + (o.distanceKm ?? 0), 0),
    }
  }, [delivered])

  const week = useMemo(() => {
    const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const now = new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const key = d.toDateString()
      const earnings = delivered
        .filter(o => new Date(o.updatedAt).toDateString() === key)
        .reduce((s, o) => s + driverPayout(o), 0)
      return { label: LABELS[d.getDay()], earnings, isToday: i === 6 }
    })
    return { days, total: days.reduce((s, d) => s + d.earnings, 0) }
  }, [delivered])

  if (!auth) return null

  const [current, ...queued] = activeOrders
  const recent = completedOrders.slice(0, 3)
  const firstName = auth.name.split(' ')[0]
  const initials = auth.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const toggleOnline = (next: boolean) => {
    haptic(next ? 'success' : 'tap')
    setOnline(next)
  }

  const handleSimulate = () => {
    const realJob = activeOrders.find(o => o.status === 'assigned' && !state.substeps[o.id])
    if (realJob) { dispatch({ type: 'SHOW_JOB_OFFER', order: realJob }); return }
    const mock: Order = {
      id:                 `CS-DEMO-${Date.now().toString().slice(-4)}`,
      status:             'assigned',
      customerId:         'demo-customer',
      customerName:       'Jordan Lee',
      assignedDriverId:   auth.driverId,
      assignedDriverName: auth.name,
      cityId:             'winnipeg',
      createdAt:          new Date().toISOString(),
      updatedAt:          new Date().toISOString(),
      distanceKm:         4.2,
      priceBreakdown: {
        baseFee: 5.99, distanceFee: 6.30, sizeFee: 0, fragileFee: 1.50,
        subtotalPreTax: 13.79, gst: 0.69, pst: 0, hst: 0, qst: 0,
        totalTax: 0.69, subtotalWithTax: 14.48, tip: 2.00, total: 16.48,
      },
      pickup:  { name: 'Sasha Novak', phone: '204 555 0198', address: '134 Princess St, Exchange District', unit: '', note: 'Buzz 302' },
      dropoff: { name: 'Mei Tanaka', phone: '204 555 0771', address: '88 Osborne St, Osborne Village', unit: 'Apt 3', note: 'Leave at front desk if no answer.' },
      parcel:  { size: 'm', desc: 'Birthday cake — chocolate', fragile: true, prohibitedItemsDeclarationAccepted: true },
      notes: [],
    }
    dispatch({ type: 'SHOW_JOB_OFFER', order: mock })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--d-bg)', color: 'var(--d-ink)', overflow: 'hidden' }}>

      {connectionStatus !== 'online' && (
        <div role="status" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0,
          padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 8px',
          background: connectionStatus === 'offline' ? 'var(--d-err-bg)' : 'var(--d-warn-bg)',
          color: connectionStatus === 'offline' ? 'var(--d-err)' : 'var(--d-warn)',
          fontSize: 13, fontWeight: 600,
        }}>
          <Icon name="wifiOff" size={16} />
          {connectionStatus === 'offline' ? 'No connection. Updates are paused.' : 'Reconnecting…'}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>

        {/* Greeting */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: `calc(${connectionStatus !== 'online' ? '0px' : 'env(safe-area-inset-top, 0px)'} + 16px) 20px 18px`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: 'var(--d-muted)' }}>{greeting()}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15 }}>{firstName}</div>
          </div>
          <button
            onClick={() => { haptic('tap'); onGoProfile() }}
            aria-label="My profile"
            className="d-press"
            style={{
              width: 44, height: 44, borderRadius: 22, flexShrink: 0, cursor: 'pointer',
              background: 'var(--d-surface)', border: '1px solid var(--d-border)', color: 'var(--d-ink)',
              fontSize: 14, fontWeight: 650, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{initials}</button>
        </header>

        <main style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Current job takes over the top slot; availability sits below it */}
          {current ? (
            <section>
              <SectionLabel>Current job</SectionLabel>
              <CurrentJob order={current} substep={state.substeps[current.id]} onOpen={() => onSelectOrder(current.id)} />
              {queued.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {queued.map(o => (
                    <Card key={o.id} onClick={() => onSelectOrder(o.id)} style={{ padding: '14px 16px', display: 'flex' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--d-muted)', marginBottom: 2 }}>Up next</div>
                          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {street(o.pickup.address)} → {street(o.dropoff.address)}
                          </div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{money(driverPayout(o))}</div>
                        <span style={{ color: 'var(--d-muted-lt)' }}><Icon name="chevron" size={18} /></span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <StatusCard online={online} onToggle={toggleOnline} />
          )}

          {/* Today */}
          <section>
            <SectionLabel action={<TextLink onClick={onGoHistory}>Earnings</TextLink>}>Today</SectionLabel>
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {money(today.earnings)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 6 }}>Earned today, including tips</div>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--d-border)', margin: '18px 0 16px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat label={today.count === 1 ? 'Delivery' : 'Deliveries'} value={String(today.count)} />
                <Stat label="Driven" value={`${today.km.toFixed(1)} km`} />
              </div>
            </Card>
          </section>

          {/* Availability, when a job occupies the top slot */}
          {current && <StatusCard online={online} onToggle={toggleOnline} />}

          {/* Week — only once there's something to show */}
          {week.total > 0 && (
            <section>
              <SectionLabel>This week</SectionLabel>
              <WeekChart days={week.days} total={week.total} />
            </section>
          )}

          {/* Recent */}
          {recent.length > 0 && (
            <section>
              <SectionLabel action={<TextLink onClick={onGoHistory}>See all</TextLink>}>Recent</SectionLabel>
              <Card padded={false}>
                {recent.map((o, i) => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--d-border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: o.status === 'delivered' ? 'var(--d-ok-bg)' : 'var(--d-surface-2)',
                      color: o.status === 'delivered' ? 'var(--d-ok)' : 'var(--d-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="box" size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {street(o.dropoff.address)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--d-muted)' }}>
                        {o.status === 'cancelled' ? 'Cancelled' : 'Delivered'} · {timeAgo(o.updatedAt)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 650, fontVariantNumeric: 'tabular-nums',
                      color: o.status === 'cancelled' ? 'var(--d-muted-lt)' : 'var(--d-ink)',
                      textDecoration: o.status === 'cancelled' ? 'line-through' : 'none',
                    }}>
                      {money(driverPayout(o))}
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {import.meta.env.DEV && (
            <button onClick={handleSimulate} style={{
              height: 44, borderRadius: 22, border: '1.5px dashed var(--d-border)', background: 'transparent',
              color: 'var(--d-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="flask" size={15} /> Simulate incoming job (dev only)
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
