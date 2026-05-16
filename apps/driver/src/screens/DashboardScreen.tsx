import React, { useState, useMemo } from 'react'
import { useDriver } from '../store/DriverContext'
import { SlideAction } from '../components/SlideAction'
import type { Order } from '@shared/types'

interface Props {
  onSelectOrder: (orderId: string) => void
  onGoHistory:   () => void
  onGoEarnings?: () => void
}

// ── Static busy zones ─────────────────────────────────────────────────────────

const BUSY_ZONES = [
  { name: 'Exchange District', demand: 'High',   next: '3 min',  color: '#ef4444', barW: '90%' },
  { name: 'Osborne Village',   demand: 'Steady', next: '8 min',  color: '#f59e0b', barW: '55%' },
  { name: 'Polo Park',         demand: 'Quiet',  next: '18 min', color: '#9ca3af', barW: '22%' },
]

// ── Top status bar (always dark) ──────────────────────────────────────────────

function DarkHeader({
  isOnline, earningsToday, todayJobs,
}: { isOnline: boolean; earningsToday: number; todayJobs: number }) {
  const dollars = Math.floor(earningsToday)
  const cents   = String(Math.round((earningsToday % 1) * 100)).padStart(2, '0')

  return (
    <div style={{
      background: '#111827',
      paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      flexShrink: 0,
    }}>
      {/* Row 1: status pill + today summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
          borderRadius: 99, padding: '4px 10px',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#6b7280',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.6 }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4 }}>TODAY</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            ${earningsToday.toFixed(2)} · {todayJobs} Jobs
          </div>
        </div>
      </div>

      {/* Row 2: day label */}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 4 }}>
        EARNINGS · {new Date().toLocaleDateString('en-CA', { weekday: 'short' }).toUpperCase()}
      </div>

      {/* Row 3: large earnings */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>
          ${dollars}
        </span>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>.{cents}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>CAD</span>
      </div>

      {/* Row 4: inline stats */}
      <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
        <div><span style={{ color: '#fff', fontWeight: 600 }}>{todayJobs}</span> jobs</div>
        <div><span style={{ color: '#fff', fontWeight: 600 }}>4.2h</span> on the road</div>
        <div><span style={{ color: '#fff', fontWeight: 600 }}>26 km</span> driven</div>
      </div>

      {/* 7-day bar chart */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'flex-end', gap: 10, height: 64 }}>
        {([0.32, 0.55, 0.42, 0.71, 0.61, 0.94, 0.48] as number[]).map((h, i) => {
          const days = ['T','F','S','S','M','T','W']
          const isToday = i === 5
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: '100%', height: `${h * 100}%`, borderRadius: 3,
                background: isToday ? '#c94a1b' : 'rgba(255,255,255,.22)',
              }}/>
              <div style={{
                fontFamily: 'monospace', fontSize: 9, letterSpacing: 1,
                color: isToday ? '#fff' : 'rgba(255,255,255,.4)',
              }}>{days[i]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardScreen({ onSelectOrder, onGoHistory, onGoEarnings }: Props) {
  const { state, completedOrders, activeOrders, dispatch } = useDriver()
  const [isOnline, setIsOnline] = useState(true)

  const { auth } = state

  const todayCompleted = useMemo(() =>
    completedOrders.filter(o => {
      const d = new Date(o.updatedAt)
      return d.toDateString() === new Date().toDateString()
    }),
    [completedOrders],
  )

  const earningsToday = useMemo(() =>
    todayCompleted.reduce((sum, o) => sum + 5.99 + (o.distanceKm ?? 0) * 1.5, 0),
    [todayCompleted],
  )

  const todayJobs = auth ? auth.completedOrders + todayCompleted.length : todayCompleted.length

  if (!auth) return null

  const handleSimulate = () => {
    const realJob = activeOrders.find(o => o.status === 'assigned' && !state.substeps[o.id])
    if (realJob) { dispatch({ type: 'SHOW_JOB_OFFER', order: realJob }); return }

    const mock: import('@shared/types').Order = {
      id:               `CS-DEMO-${Date.now().toString().slice(-4)}`,
      status:           'assigned',
      customerId:       'demo-customer',
      customerName:     'Jordan Lee',
      assignedDriverId:   auth.driverId,
      assignedDriverName: auth.name,
      cityId:           'winnipeg',
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
      distanceKm:       4.2,
      priceBreakdown: {
        baseFee: 5.99, distanceFee: 6.30, sizeFee: 0, fragileFee: 1.50,
        subtotalPreTax: 13.79, gst: 0.69, pst: 0, hst: 0, qst: 0,
        totalTax: 0.69, subtotalWithTax: 14.48, tip: 2.00, total: 16.48,
      },
      pickup: { name: 'Sasha Novak', phone: '204 555 0198', address: '134 Princess St, Exchange District', unit: '', note: 'Buzz 302' },
      dropoff: { name: 'Mei Tanaka', phone: '204 555 0771', address: '88 Osborne St, Osborne Village', unit: 'Apt 3', note: 'Leave at front desk if no answer.' },
      parcel: { size: 'm', desc: 'Birthday cake — chocolate', fragile: true, prohibitedItemsDeclarationAccepted: true },
      notes: [],
    }
    dispatch({ type: 'SHOW_JOB_OFFER', order: mock })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--d-bg)', overflow: 'hidden' }}>

      {/* Dark header */}
      <DarkHeader isOnline={isOnline} earningsToday={earningsToday} todayJobs={todayJobs} />

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* ── Offline: slide to go online ─────────────────────────────────── */}
        {!isOnline && (
          <div style={{ padding: '20px 20px 0' }}>
            <SlideAction
              label="Slide to go online"
              variant="green"
              onSlideComplete={() => setIsOnline(true)}
            />
          </div>
        )}

        {/* ── Online: status + simulate ────────────────────────────────────── */}
        {isOnline && (
          <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Status row */}
            <div style={{
              background: '#fff', border: '1px solid var(--d-border)', borderRadius: 18, padding: 18,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Ping ring icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: 'rgba(63,185,107,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 22, border: '2px solid #3fb96b',
                  animation: 'cs-ping 1.6s ease-out infinite',
                }}/>
                {/* Flash bolt */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="#166b3a">
                  <path d="M10.5 2L4 10h5.5L7.5 16 14 8H8.5z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--d-ink)', letterSpacing: -0.2 }}>Looking for jobs nearby</div>
                <div style={{ fontSize: 13, color: 'var(--d-muted)', marginTop: 2 }}>Avg wait this hour · 6 min</div>
              </div>
              <button
                onClick={() => setIsOnline(false)}
                style={{
                  padding: '8px 14px', background: '#f3f4f6',
                  border: 'none', borderRadius: 999,
                  fontSize: 13, fontWeight: 500, color: 'var(--d-ink)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Stop</button>
            </div>

            {/* Simulate button */}
            <button
              onClick={handleSimulate}
              style={{
                width: '100%', padding: '13px 0',
                background: 'var(--d-accent)', border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2l10 6-10 6V2z"/>
              </svg>
              Simulate incoming job
            </button>
          </div>
        )}

        {/* ── Active jobs ──────────────────────────────────────────────────── */}
        {activeOrders.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
              Active Jobs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeOrders.slice(0, 3).map(order => (
                <button
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  style={{
                    width: '100%', background: '#fff',
                    border: `1.5px solid ${order.status === 'assigned' ? 'var(--d-accent)' : 'var(--d-border)'}`,
                    borderRadius: 12, padding: '12px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--d-accent)', fontWeight: 700, marginBottom: 2, letterSpacing: 0.3 }}>
                      {order.id}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--d-ink)', fontWeight: 500 }}>
                      {order.pickup.address.split(',')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 2 }}>
                      → {order.dropoff.address.split(',')[0]}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-ink)' }}>
                      ${(5.99 + order.distanceKm * 1.5).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{order.distanceKm} km</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── WHERE IT'S BUSY ──────────────────────────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--d-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Where it's busy
          </div>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--d-border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BUSY_ZONES.map(zone => (
              <div key={zone.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: zone.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--d-ink)' }}>{zone.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--d-muted)' }}>{zone.demand} · next job {zone.next}</div>
                </div>
                <div style={{ width: 56, height: 6, background: 'var(--d-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: zone.barW, height: '100%', background: zone.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom action grid ────────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {([
            { label: 'Earnings', icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="16" height="12" rx="2"/><path d="M6 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"/><path d="M10 10v2m0-4v.5"/>
              </svg>
            )},
            { label: 'Schedule', icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="14" height="14" rx="2"/><path d="M7 2v2M13 2v2M3 8h14"/>
              </svg>
            )},
            { label: 'Help', icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7"/><path d="M10 14v.5"/><path d="M10 11a2.5 2.5 0 1 0-2.5-2.5"/>
              </svg>
            )},
          ]).map(a => (
            <button key={a.label} style={{
              padding: '14px 10px', background: '#fff', border: '1px solid var(--d-border)',
              borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              color: 'var(--d-ink)',
            }}>
              {a.icon}
              <span style={{ fontSize: 12, fontWeight: 500 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* History link */}
        {completedOrders.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <button
              onClick={onGoHistory}
              style={{
                width: '100%', padding: '13px 16px',
                background: '#fff', border: '1px solid var(--d-border)',
                borderRadius: 12, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)', textAlign: 'left' }}>Delivery History</div>
                <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 1, textAlign: 'left' }}>
                  {completedOrders.length} completed
                </div>
              </div>
              <span style={{ color: 'var(--d-muted)', fontSize: 18 }}>›</span>
            </button>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>


      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes cs-ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
      `}</style>
    </div>
  )
}
