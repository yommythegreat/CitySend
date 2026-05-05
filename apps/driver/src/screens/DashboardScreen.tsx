import React, { useState, useMemo } from 'react'
import { useDriver } from '../store/DriverContext'
import type { Order } from '@shared/types'

interface Props {
  onSelectOrder: (orderId: string) => void
  onGoHistory:   () => void
  onGoEarnings?: () => void
}

// ── Busy zones (static demo data) ────────────────────────────────────────────

const BUSY_ZONES = [
  { name: 'Exchange District', demand: 'High',   next: '~3 min',  color: '#ef4444' },
  { name: 'Osborne Village',   demand: 'Steady', next: '~8 min',  color: '#f59e0b' },
  { name: 'Polo Park',         demand: 'Quiet',  next: '~18 min', color: '#6b7280' },
]

// ── Stats helpers ─────────────────────────────────────────────────────────────

function hoursOnline(): string {
  // Placeholder — real implementation would track session start
  return '4.2'
}

function kmDriven(orders: Order[]): string {
  return orders
    .reduce((sum, o) => sum + (o.distanceKm ?? 0), 0)
    .toFixed(0)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function BusyZoneChip({ zone }: { zone: typeof BUSY_ZONES[number] }) {
  return (
    <div style={{
      flexShrink: 0,
      background: '#fff',
      border: '1px solid var(--d-border)',
      borderRadius: 12,
      padding: '12px 16px',
      minWidth: 160,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--d-ink)' }}>{zone.name}</div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: zone.color, marginTop: 3, flexShrink: 0,
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 4 }}>
        {zone.demand} · next job {zone.next}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardScreen({ onSelectOrder, onGoHistory, onGoEarnings }: Props) {
  const { state, completedOrders, activeOrders, dispatch } = useDriver()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<'earnings' | 'schedule' | 'help'>('earnings')

  const { auth } = state

  // Earnings today (completed orders × estimated average)
  const todayCompleted = useMemo(() =>
    completedOrders.filter(o => {
      const d = new Date(o.updatedAt), t = new Date()
      return d.toDateString() === t.toDateString()
    }),
    [completedOrders],
  )

  const earningsToday = useMemo(() =>
    todayCompleted.reduce((sum, o) => {
      const base = 5.99
      const dist = (o.distanceKm ?? 0) * 1.5
      return sum + base + dist
    }, 0),
    [todayCompleted],
  )

  const totalKm = useMemo(() =>
    completedOrders.reduce((sum, o) => sum + (o.distanceKm ?? 0), 0),
    [completedOrders],
  )

  if (!auth) return null

  // ── Simulate incoming job: pick an unassigned order and assign it ─────────
  const handleSimulate = () => {
    // Find an order assigned to this driver that isn't yet accepted as a substep
    const newJob = activeOrders.find(o => o.status === 'assigned' && !state.substeps[o.id])
    if (newJob) {
      dispatch({ type: 'SHOW_JOB_OFFER', order: newJob })
    } else {
      alert('No assignable jobs in queue.\nAssign an order to this driver from the Admin panel first.')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--d-bg)',
      overflowY: 'auto',
      scrollbarWidth: 'none',
    }}>

      {/* ── Dark earnings header card ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #1a1a1a 0%, #2c2c2c 100%)',
        padding: '52px 20px 28px',
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Driver status pill (top left) */}
        <div style={{
          position: 'absolute', top: 14, left: 16,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#6b7280',
          }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Earnings + stats (top right) */}
        <div style={{
          position: 'absolute', top: 12, right: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>EARNINGS</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              ${earningsToday.toFixed(2)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {todayCompleted.length} Jobs
          </div>
        </div>

        {/* Large earnings display */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 }}>
            EARNINGS TODAY
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
              ${Math.floor(earningsToday)}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              .{String(Math.round((earningsToday % 1) * 100)).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>CAD</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 24,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <StatRow label="Jobs" value={String(auth.completedOrders + todayCompleted.length)} />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatRow label="Hours online" value={hoursOnline()} />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatRow label="km driven" value={`${totalKm.toFixed(0)}`} />
        </div>

        {/* Status + Stop button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#6b7280',
              animation: isOnline ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {isOnline ? 'Looking for jobs nearby' : 'You are offline'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              Avg wait this hour: 8 min
            </span>
          </div>
          <button
            onClick={() => setIsOnline(v => !v)}
            style={{
              padding: '6px 14px',
              background: isOnline ? 'rgba(255,255,255,0.15)' : '#22c55e',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isOnline ? 'Stop' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* ── Simulate incoming job (dev button) ───────────────────────────────── */}
      {isOnline && (
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <button
            onClick={handleSimulate}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'var(--d-accent)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(201,74,27,0.3)',
            }}
          >
            <span style={{ fontSize: 18 }}>⚡</span>
            Simulate incoming job
          </button>
        </div>
      )}

      {/* ── Active jobs ───────────────────────────────────────────────────────── */}
      {activeOrders.length > 0 && (
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>
            Active Jobs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeOrders.slice(0, 3).map(order => (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                style={{
                  width: '100%',
                  background: '#fff',
                  border: `2px solid ${order.status === 'assigned' ? 'var(--d-accent)' : 'var(--d-border)'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--d-accent)', fontWeight: 700, marginBottom: 2 }}>
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--d-ink)' }}>
                    ${(5.99 + order.distanceKm * 1.5).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--d-muted)' }}>{order.distanceKm} km</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Where it's busy ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 0 0', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-muted)', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase', paddingLeft: 20 }}>
          Where it's busy
        </div>
        <div style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {BUSY_ZONES.map(zone => <BusyZoneChip key={zone.name} zone={zone} />)}
        </div>
      </div>

      {/* History link */}
      {completedOrders.length > 0 && (
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <button
            onClick={onGoHistory}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#fff',
              border: '1px solid var(--d-border)',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-ink)' }}>Delivery History</div>
              <div style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 2 }}>
                {completedOrders.length} completed
              </div>
            </div>
            <span style={{ color: 'var(--d-muted)', fontSize: 20 }}>›</span>
          </button>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* ── Bottom nav tabs ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid var(--d-border)',
        background: '#fff',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        flexShrink: 0,
      }}>
        {(['earnings', 'schedule', 'help'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 8px 10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: activeTab === tab ? 'var(--d-accent)' : 'var(--d-muted)',
              fontSize: 10,
              fontWeight: activeTab === tab ? 700 : 400,
              textTransform: 'capitalize',
            }}
          >
            <span style={{ fontSize: 18 }}>
              {tab === 'earnings' ? '💰' : tab === 'schedule' ? '📅' : '❓'}
            </span>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
