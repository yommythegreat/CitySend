/**
 * AnalyticsScreen — Fully interactive, filter-aware analytics dashboard.
 *
 * All data flows from AdminContext (orders, drivers, receipts, incidents).
 * Every number responds to the global filter bar.
 * Clicking summary cards expands a detail section.
 * Clicking chart elements drills down to underlying records.
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useAdminStore } from '../store/AdminContext'
import { fmt, relativeTime } from '@shared/utils/format'
import type { Order, IncidentReport, Driver, OrderStatus, CityId } from '@shared/types'
import { ORDER_STATUS_LABELS, INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS } from '@shared/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type DateRange = 'today' | '7d' | '30d' | 'all'

interface Filters {
  dateRange: DateRange
  cityId:    string   // 'all' | CityId
  driverId:  string   // 'all' | driver.id
  status:    string   // 'all' | OrderStatus
}

type ActiveSection = 'revenue' | 'deliveries' | 'tips' | 'incidents' | null

interface DrillDownState {
  label:      string
  orders?:    Order[]
  incidents?: IncidentReport[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function startOf(range: DateRange): number {
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (range === 'today') return today.getTime()
  if (range === '7d')    return now - 7  * 86_400_000
  if (range === '30d')   return now - 30 * 86_400_000
  return 0
}

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function dayLabel(key: string) {
  return new Date(key).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

function pct(n: number, total: number) {
  return total ? `${((n / total) * 100).toFixed(0)}%` : '0%'
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────

const DATE_RANGE_OPTS: { v: DateRange; l: string }[] = [
  { v: 'today', l: 'Today'   },
  { v: '7d',    l: '7 days'  },
  { v: '30d',   l: '30 days' },
  { v: 'all',   l: 'All time'},
]

function FilterBar({
  filters, setFilters, drivers, cities,
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  drivers: Driver[]
  cities: string[]
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters(f => ({ ...f, [k]: v }))

  const selStyle: React.CSSProperties = {
    padding: '6px 10px', border: '1.5px solid var(--a-border)',
    borderRadius: 7, fontSize: 12, fontFamily: 'var(--a-font)',
    background: '#fff', color: 'var(--a-ink)', outline: 'none', cursor: 'pointer',
  }

  const activeFiltersCount = [
    filters.dateRange !== 'all',
    filters.cityId    !== 'all',
    filters.driverId  !== 'all',
    filters.status    !== 'all',
  ].filter(Boolean).length

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      padding: '12px 16px', background: 'var(--a-bg)',
      borderRadius: 10, border: '1px solid var(--a-border)',
      marginBottom: 24,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginRight: 4 }}>Filter</span>

      {/* Date range toggle group */}
      <div style={{ display: 'flex', border: '1.5px solid var(--a-border)', borderRadius: 7, overflow: 'hidden' }}>
        {DATE_RANGE_OPTS.map(o => (
          <button
            key={o.v}
            onClick={() => set('dateRange', o.v)}
            style={{
              padding: '5px 11px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: filters.dateRange === o.v ? 'var(--a-sidebar)' : '#fff',
              color:      filters.dateRange === o.v ? '#fff' : 'var(--a-ink2)',
              borderRight: '1px solid var(--a-border)',
              transition: 'background .15s',
            }}
          >{o.l}</button>
        ))}
      </div>

      {/* City */}
      <select style={selStyle} value={filters.cityId} onChange={e => set('cityId', e.target.value)}>
        <option value="all">All cities</option>
        {cities.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
      </select>

      {/* Driver */}
      <select style={selStyle} value={filters.driverId} onChange={e => set('driverId', e.target.value)}>
        <option value="all">All drivers</option>
        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      {/* Status */}
      <select style={selStyle} value={filters.status} onChange={e => set('status', e.target.value)}>
        <option value="all">All statuses</option>
        {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(([k, v]) =>
          <option key={k} value={k}>{v}</option>
        )}
      </select>

      {/* Clear */}
      {activeFiltersCount > 0 && (
        <button
          onClick={() => setFilters({ dateRange: 'all', cityId: 'all', driverId: 'all', status: 'all' })}
          style={{
            padding: '5px 11px', border: 'none', borderRadius: 7, cursor: 'pointer',
            background: 'var(--a-err-bg)', color: 'var(--a-err)', fontSize: 12, fontWeight: 600,
          }}
        >
          ✕ Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  id, label, value, sub, accent, active, onClick,
}: {
  id: string; label: string; value: string | number; sub?: string
  accent?: boolean; active?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 160, textAlign: 'left', cursor: 'pointer',
        padding: '18px 20px', borderRadius: 12,
        background: active
          ? 'var(--a-sidebar)'
          : accent ? '#1e2838' : 'var(--a-surface)',
        border: active
          ? 'none'
          : `1.5px solid ${active ? 'transparent' : 'var(--a-border)'}`,
        boxShadow: active ? '0 4px 16px rgba(0,0,0,0.15)' : 'var(--a-shadow)',
        transition: 'all .18s ease',
        transform: active ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
        color: active || accent ? 'rgba(255,255,255,0.55)' : 'var(--a-muted)',
        marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        <span style={{ fontSize: 10, opacity: active ? 0.7 : 0.4 }}>{active ? '▲' : '▼'}</span>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700, letterSpacing: -0.8,
        color: active || accent ? '#fff' : 'var(--a-ink)', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, marginTop: 6, color: active || accent ? 'rgba(255,255,255,0.5)' : 'var(--a-muted)' }}>
        {sub}
      </div>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DRILL-DOWN PANEL
// ─────────────────────────────────────────────────────────────────────────────

function DrillDownPanel({
  state: drillState,
  onClose,
}: {
  state: DrillDownState
  onClose: () => void
}) {
  const { orders = [], incidents = [], label } = drillState
  return (
    <div style={{
      border: '1.5px solid var(--a-accent)', borderRadius: 12,
      background: 'var(--a-surface)', overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--a-sidebar)', borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
          🔍 {label}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
        >×</button>
      </div>

      {orders.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <table className="a-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Status</th>
                <th>Driver</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--a-muted)' }}>No orders.</td></tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--a-mono)', fontWeight: 600 }}>{o.id}</td>
                  <td>{o.customerName}</td>
                  <td style={{ color: 'var(--a-muted)', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.pickup.address.split(',')[0]} → {o.dropoff.address.split(',')[0]}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: 'var(--a-bg)', color: 'var(--a-ink2)',
                    }}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </td>
                  <td style={{ color: 'var(--a-muted)' }}>{o.assignedDriverName ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--a-mono)', fontWeight: 600 }}>
                    {fmt(o.priceBreakdown.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {incidents.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <table className="a-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reporter</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(i => (
                <tr key={i.id}>
                  <td style={{ fontFamily: 'var(--a-mono)', fontWeight: 600 }}>{i.id}</td>
                  <td style={{ fontFamily: 'var(--a-mono)' }}>{i.orderId}</td>
                  <td>{i.category}</td>
                  <td>{INCIDENT_SEVERITY_LABELS[i.severity]}</td>
                  <td>{INCIDENT_STATUS_LABELS[i.status]}</td>
                  <td style={{ color: 'var(--a-muted)' }}>{i.reporterName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders.length === 0 && incidents.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--a-muted)', fontSize: 13 }}>
          No records found.
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BAR ROW (horizontal bar with optional click)
// ─────────────────────────────────────────────────────────────────────────────

function BarRow({
  label, value, sub, bar, barMax, color, onClick,
}: {
  label: string; value: string; sub?: string; bar: number; barMax: number
  color?: string; onClick?: () => void
}) {
  const pctWidth = barMax > 0 ? Math.min(100, (bar / barMax) * 100) : 0
  const content = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
      borderBottom: '1px solid var(--a-border)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background .12s',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--a-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ width: 90, height: 6, background: 'var(--a-bg)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          width: `${pctWidth}%`, height: '100%',
          background: color ?? 'var(--a-accent)', borderRadius: 3,
          transition: 'width .4s ease',
        }} />
      </div>
      <div style={{
        fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: 600,
        color: 'var(--a-ink)', flexShrink: 0, minWidth: 56, textAlign: 'right',
      }}>
        {value}
      </div>
      {onClick && <span style={{ fontSize: 12, color: 'var(--a-accent)', flexShrink: 0 }}>›</span>}
    </div>
  )

  return onClick ? (
    <button onClick={onClick} style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--a-bg)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >{content}</button>
  ) : <div>{content}</div>
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title, count, children, action,
}: {
  title: string; count?: number; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-ink)', letterSpacing: -0.2 }}>{title}</span>
          {count !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--a-muted)' }}>{count} total</span>
          )}
        </div>
        {action}
      </div>
      <div style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED SECTIONS (shown when a summary card is clicked)
// ─────────────────────────────────────────────────────────────────────────────

function RevenueDetail({
  orders, receipts, drivers,
}: {
  orders: Order[]; receipts: { orderId: string; total: number; tip: number; tax: number }[]; drivers: Driver[]
}) {
  const delivered = orders.filter(o => o.status === 'delivered')

  // By city
  const byCity: Record<string, number> = {}
  delivered.forEach(o => {
    const r = receipts.find(r => r.orderId === o.id)
    byCity[o.cityId] = (byCity[o.cityId] ?? 0) + (r?.total ?? o.priceBreakdown.total)
  })
  const cityEntries = Object.entries(byCity).sort((a, b) => b[1] - a[1])
  const maxCity     = cityEntries[0]?.[1] ?? 1

  // By driver
  const byDriver: Record<string, { name: string; total: number; count: number }> = {}
  delivered.forEach(o => {
    if (!o.assignedDriverId) return
    const r = receipts.find(r => r.orderId === o.id)
    const id = o.assignedDriverId
    if (!byDriver[id]) byDriver[id] = { name: o.assignedDriverName ?? id, total: 0, count: 0 }
    byDriver[id].total += r?.total ?? o.priceBreakdown.total
    byDriver[id].count++
  })
  const driverEntries = Object.entries(byDriver).sort((a, b) => b[1].total - a[1].total).slice(0, 5)
  const maxDriver     = driverEntries[0]?.[1].total ?? 1

  const totalRevenue = Object.values(byCity).reduce((s, v) => s + v, 0)
  const totalTax     = receipts.filter(r => delivered.find(o => o.id === r.orderId)).reduce((s, r) => s + r.tax, 0)
  const totalTips    = receipts.filter(r => delivered.find(o => o.id === r.orderId)).reduce((s, r) => s + r.tip, 0)

  return (
    <div style={{ padding: '16px 20px 4px', borderTop: '2px solid var(--a-accent)', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Gross revenue', value: fmt(totalRevenue) },
          { label: 'Tax collected', value: fmt(totalTax) },
          { label: 'Tips',          value: fmt(totalTips) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--a-mono)', color: 'var(--a-ink)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>By city</div>
          {cityEntries.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--a-muted)', padding: '8px 0' }}>No data</div>
            : cityEntries.map(([city, total]) => (
                <BarRow key={city} label={city.charAt(0).toUpperCase() + city.slice(1)} value={fmt(total)} bar={total} barMax={maxCity} color="var(--a-ok)" />
              ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top drivers</div>
          {driverEntries.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--a-muted)', padding: '8px 0' }}>No data</div>
            : driverEntries.map(([id, d]) => (
                <BarRow key={id} label={d.name} value={fmt(d.total)} sub={`${d.count} deliveries`} bar={d.total} barMax={maxDriver} />
              ))}
        </div>
      </div>
    </div>
  )
}

function DeliveriesDetail({
  orders, onDrillDown,
}: {
  orders: Order[]; onDrillDown: (dd: DrillDownState) => void
}) {
  const byStatus: Record<string, number> = {}
  orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1 })
  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1] - a[1])
  const maxStatus = statusEntries[0]?.[1] ?? 1

  const byCity: Record<string, number> = {}
  orders.forEach(o => { byCity[o.cityId] = (byCity[o.cityId] ?? 0) + 1 })
  const cityEntries = Object.entries(byCity).sort((a, b) => b[1] - a[1])
  const maxCity = cityEntries[0]?.[1] ?? 1

  const fragile   = orders.filter(o => o.parcel.fragile).length
  const totalOrders = orders.length

  return (
    <div style={{ padding: '16px 20px 4px', borderTop: '2px solid var(--a-accent)', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total orders',     value: totalOrders },
          { label: 'Fragile',          value: `${fragile} (${pct(fragile, totalOrders)})` },
          { label: 'Cancel rate',      value: pct(orders.filter(o => o.status === 'cancelled').length, totalOrders) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--a-mono)', color: 'var(--a-ink)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>By status</div>
          {statusEntries.map(([status, count]) => (
            <BarRow
              key={status}
              label={ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
              value={`${count} (${pct(count, totalOrders)})`}
              bar={count} barMax={maxStatus}
              onClick={() => onDrillDown({
                label: `${ORDER_STATUS_LABELS[status as OrderStatus] ?? status} orders`,
                orders: orders.filter(o => o.status === status),
              })}
            />
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>By city</div>
          {cityEntries.map(([city, count]) => (
            <BarRow
              key={city}
              label={city.charAt(0).toUpperCase() + city.slice(1)}
              value={`${count} (${pct(count, totalOrders)})`}
              bar={count} barMax={maxCity}
              onClick={() => onDrillDown({
                label: `Orders in ${city.charAt(0).toUpperCase() + city.slice(1)}`,
                orders: orders.filter(o => o.cityId === city),
              })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TipsDetail({ orders, receipts }: { orders: Order[]; receipts: { orderId: string; tip: number }[] }) {
  const delivered  = orders.filter(o => o.status === 'delivered')
  const tipsData   = delivered.map(o => {
    const r = receipts.find(r => r.orderId === o.id)
    return r?.tip ?? o.priceBreakdown.tip
  })
  const buckets = [0, 2, 3, 5]
  const dist = buckets.map(b => ({ label: b === 0 ? 'No tip' : `$${b}`, count: tipsData.filter(t => t === b).length }))
  const other = tipsData.filter(t => !buckets.includes(t)).length
  if (other > 0) dist.push({ label: 'Other', count: other })
  const maxBucket = Math.max(...dist.map(d => d.count), 1)
  const avgTip    = tipsData.length ? tipsData.reduce((s, t) => s + t, 0) / tipsData.length : 0
  const pctTipping = delivered.length ? ((tipsData.filter(t => t > 0).length / delivered.length) * 100).toFixed(0) : '0'

  return (
    <div style={{ padding: '16px 20px 4px', borderTop: '2px solid var(--a-accent)', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total tips', value: fmt(tipsData.reduce((s, t) => s + t, 0)) },
          { label: 'Average tip', value: fmt(avgTip) },
          { label: '% tipping', value: `${pctTipping}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--a-mono)', color: 'var(--a-ink)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tip distribution</div>
      {dist.map(d => (
        <BarRow key={d.label} label={d.label} value={`${d.count} (${pct(d.count, tipsData.length)})`} bar={d.count} barMax={maxBucket} color="var(--a-ok)" />
      ))}
    </div>
  )
}

function IncidentsDetail({
  incidents, orders, onDrillDown,
}: {
  incidents: IncidentReport[]; orders: Order[]; onDrillDown: (dd: DrillDownState) => void
}) {
  const bySeverity: Record<string, IncidentReport[]> = {}
  incidents.forEach(i => { (bySeverity[i.severity] ??= []).push(i) })
  const sevEntries = [['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']]
    .map(([k, l]) => ({ key: k, label: l, items: bySeverity[k] ?? [] }))
    .filter(e => e.items.length > 0)
  const maxSev = Math.max(...sevEntries.map(e => e.items.length), 1)

  const byCategory: Record<string, IncidentReport[]> = {}
  incidents.forEach(i => { (byCategory[i.category] ??= []).push(i) })
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length).slice(0, 6)
  const maxCat = catEntries[0]?.[1].length ?? 1

  const open     = incidents.filter(i => ['new','in_review','escalated'].includes(i.status)).length
  const resolved = incidents.filter(i => i.status === 'resolved').length

  return (
    <div style={{ padding: '16px 20px 4px', borderTop: '2px solid var(--a-accent)', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total incidents', value: incidents.length },
          { label: 'Open',            value: open },
          { label: 'Resolved',        value: resolved },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--a-mono)', color: 'var(--a-ink)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>By severity</div>
          {sevEntries.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--a-muted)', padding: '8px 0' }}>No incidents</div>
            : sevEntries.map(e => (
                <BarRow
                  key={e.key}
                  label={e.label}
                  value={String(e.items.length)}
                  bar={e.items.length} barMax={maxSev}
                  color={e.key === 'critical' ? '#dc2626' : e.key === 'high' ? '#f59e0b' : 'var(--a-accent)'}
                  onClick={() => onDrillDown({ label: `${e.label} severity incidents`, incidents: e.items })}
                />
              ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top categories</div>
          {catEntries.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--a-muted)', padding: '8px 0' }}>No incidents</div>
            : catEntries.map(([cat, items]) => (
                <BarRow
                  key={cat}
                  label={cat}
                  value={String(items.length)}
                  bar={items.length} barMax={maxCat}
                  onClick={() => onDrillDown({ label: `"${cat}" incidents`, incidents: items })}
                />
              ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY TREND CHART
// ─────────────────────────────────────────────────────────────────────────────

function DeliveryTrend({
  orders, dateRange, onDrillDown,
}: {
  orders: Order[]; dateRange: DateRange; onDrillDown: (dd: DrillDownState) => void
}) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const days = useMemo(() => {
    const n = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 14
    const result: { key: string; label: string; delivered: number; cancelled: number; orders: Order[] }[] = []
    for (let i = n - 1; i >= 0; i--) {
      const d    = new Date(Date.now() - i * 86_400_000)
      const key  = dayKey(d.toISOString())
      const dayOrders = orders.filter(o => dayKey(o.createdAt) === key)
      result.push({
        key,
        label:     n <= 7 ? new Date(key).toLocaleDateString('en-CA', { weekday: 'short' }) : String(new Date(key).getDate()),
        delivered: dayOrders.filter(o => o.status === 'delivered').length,
        cancelled: dayOrders.filter(o => o.status === 'cancelled').length,
        orders:    dayOrders,
      })
    }
    return result
  }, [orders, dateRange])

  const maxVal = Math.max(...days.map(d => d.delivered + d.cancelled), 1)

  const nDays = days.length
  const barWidth = nDays <= 7 ? 48 : nDays <= 14 ? 32 : 20

  return (
    <Section
      title="Delivery trend"
      action={<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>Click a day to see orders</span>}
    >
      <div style={{ padding: '16px 16px 8px' }}>
        {/* Chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginBottom: 4 }}>
          {days.map(d => {
            const totalH  = ((d.delivered + d.cancelled) / maxVal) * 100
            const delH    = (d.delivered / maxVal) * 100
            const canH    = (d.cancelled / maxVal) * 100
            const isHov   = hoveredDay === d.key
            return (
              <button
                key={d.key}
                onClick={() => onDrillDown({ label: `Orders on ${dayLabel(d.key)}`, orders: d.orders })}
                onMouseEnter={() => setHoveredDay(d.key)}
                onMouseLeave={() => setHoveredDay(null)}
                title={`${dayLabel(d.key)}: ${d.delivered} delivered, ${d.cancelled} cancelled`}
                style={{
                  flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: 'flex-end', background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: 4, padding: '0 1px',
                  transition: 'opacity .15s',
                  opacity: hoveredDay && !isHov ? 0.55 : 1,
                }}
              >
                {d.cancelled > 0 && (
                  <div style={{
                    width: '100%', height: `${canH}%`, minHeight: d.cancelled > 0 ? 3 : 0,
                    background: '#fca5a5', borderRadius: '3px 3px 0 0',
                    transition: 'height .35s ease',
                  }} />
                )}
                <div style={{
                  width: '100%', height: `${delH}%`, minHeight: (d.delivered + d.cancelled) > 0 ? 4 : 0,
                  background: isHov ? 'var(--a-accent)' : 'var(--a-sidebar)',
                  borderRadius: d.cancelled > 0 ? '0' : '3px 3px 0 0',
                  transition: 'height .35s ease, background .15s',
                }} />
                {(d.delivered + d.cancelled) === 0 && (
                  <div style={{ width: '100%', height: 2, background: 'var(--a-border)', borderRadius: 3 }} />
                )}
              </button>
            )
          })}
        </div>
        {/* X-axis labels */}
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map(d => (
            <div key={d.key} style={{
              flex: 1, textAlign: 'center', fontSize: 10,
              color: hoveredDay === d.key ? 'var(--a-accent)' : 'var(--a-muted)',
              fontWeight: hoveredDay === d.key ? 600 : 400,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>{d.label}</div>
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[
            { color: 'var(--a-sidebar)', label: 'Delivered' },
            { color: '#fca5a5',          label: 'Cancelled' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'var(--a-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP DRIVERS TABLE
// ─────────────────────────────────────────────────────────────────────────────

type DriverSort = 'deliveries' | 'revenue' | 'rating'

function TopDriversTable({
  orders, drivers, receipts, onDrillDown,
}: {
  orders: Order[]; drivers: Driver[]
  receipts: { orderId: string; total: number }[]
  onDrillDown: (dd: DrillDownState) => void
}) {
  const [sort, setSort] = useState<DriverSort>('deliveries')

  const rows = useMemo(() => {
    return drivers.map(d => {
      const driverOrders = orders.filter(o =>
        o.assignedDriverId === d.id && o.status === 'delivered'
      )
      const revenue = driverOrders.reduce((s, o) => {
        const r = receipts.find(r => r.orderId === o.id)
        return s + (r?.total ?? o.priceBreakdown.total)
      }, 0)
      return {
        driver:    d,
        deliveries: driverOrders.length,
        revenue,
        orders:    driverOrders,
      }
    })
    .filter(r => r.deliveries > 0 || r.driver.completedOrders > 0)
  }, [drivers, orders, receipts])

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sort === 'deliveries') return b.deliveries - a.deliveries
    if (sort === 'revenue')    return b.revenue    - a.revenue
    return b.driver.rating - a.driver.rating
  }), [rows, sort])

  const SortBtn = ({ k, label }: { k: DriverSort; label: string }) => (
    <button
      onClick={() => setSort(k)}
      style={{
        padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
        background: sort === k ? 'var(--a-sidebar)' : 'var(--a-bg)',
        color: sort === k ? '#fff' : 'var(--a-muted)',
      }}
    >{label}</button>
  )

  return (
    <Section
      title="Drivers"
      count={sorted.length}
      action={
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--a-muted)', marginRight: 4, alignSelf: 'center' }}>Sort:</span>
          <SortBtn k="deliveries" label="Deliveries" />
          <SortBtn k="revenue"    label="Revenue"    />
          <SortBtn k="rating"     label="Rating"     />
        </div>
      }
    >
      {sorted.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--a-muted)', fontSize: 13 }}>
          No driver data for this filter.
        </div>
      ) : (
        <table className="a-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Deliveries</th>
              <th style={{ textAlign: 'right' }}>Revenue</th>
              <th style={{ textAlign: 'right' }}>Rating</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ driver: d, deliveries, revenue, orders: dOrders }) => (
              <tr
                key={d.id}
                className="clickable"
                onClick={() => onDrillDown({
                  label: `Deliveries by ${d.name}`,
                  orders: dOrders,
                })}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#2b3548,#5b657a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{d.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--a-muted)' }}>{d.vehicle?.split('—')[0].trim()}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                    background: d.status === 'available' ? 'var(--a-ok-bg)' : d.status === 'busy' ? 'var(--a-warn-bg)' : 'var(--a-bg)',
                    color: d.status === 'available' ? 'var(--a-ok)' : d.status === 'busy' ? 'var(--a-warn)' : 'var(--a-muted)',
                  }}>{{available:'Available',busy:'Busy',offline:'Offline',suspended:'Suspended'}[d.status] ?? d.status}</span>
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: sort === 'deliveries' ? 700 : 400 }}>
                  {deliveries}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: sort === 'revenue' ? 700 : 400 }}>
                  {fmt(revenue)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ color: '#f59e0b', marginRight: 4 }}>★</span>
                  <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: sort === 'rating' ? 700 : 400 }}>
                    {d.rating.toFixed(1)}
                  </span>
                </td>
                <td style={{ textAlign: 'right', color: 'var(--a-accent)', fontSize: 14 }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT ANALYTICS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function IncidentAnalytics({
  incidents, drivers, onDrillDown,
}: {
  incidents: IncidentReport[]
  drivers: Driver[]
  onDrillDown: (dd: DrillDownState) => void
}) {
  // By driver
  const byDriver: Record<string, IncidentReport[]> = {}
  incidents.forEach(i => { (byDriver[i.reporterId] ??= []).push(i) })
  const driverEntries = Object.entries(byDriver)
    .map(([id, items]) => ({
      name: drivers.find(d => d.id === id)?.name ?? items[0].reporterName,
      count: items.length, items,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxDriverInc = driverEntries[0]?.count ?? 1

  // By source
  const bySource = [
    { label: 'Customer', count: incidents.filter(i => i.source === 'customer').length, items: incidents.filter(i => i.source === 'customer') },
    { label: 'Driver',   count: incidents.filter(i => i.source === 'driver').length,   items: incidents.filter(i => i.source === 'driver')   },
    { label: 'Admin',    count: incidents.filter(i => i.source === 'admin').length,     items: incidents.filter(i => i.source === 'admin')     },
  ].filter(s => s.count > 0)
  const maxSource = Math.max(...bySource.map(s => s.count), 1)

  return (
    <Section title="Incident breakdown" count={incidents.length}>
      {incidents.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--a-muted)', fontSize: 13 }}>
          ✅ No incidents in this period.
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>By source</div>
            {bySource.map(s => (
              <BarRow
                key={s.label}
                label={s.label}
                value={`${s.count} (${pct(s.count, incidents.length)})`}
                bar={s.count} barMax={maxSource}
                onClick={() => onDrillDown({ label: `${s.label} incidents`, incidents: s.items })}
              />
            ))}
          </div>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Most-reporting drivers</div>
            {driverEntries.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--a-muted)', padding: '8px 0' }}>No driver incidents</div>
              : driverEntries.map(d => (
                  <BarRow
                    key={d.name}
                    label={d.name}
                    value={String(d.count)}
                    bar={d.count} barMax={maxDriverInc}
                    onClick={() => onDrillDown({ label: `Incidents by ${d.name}`, incidents: d.items })}
                  />
                ))}
          </div>
        </div>
      )}
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = { dateRange: 'all', cityId: 'all', driverId: 'all', status: 'all' }

export function AnalyticsScreen() {
  const { state } = useAdminStore()
  const { orders, drivers, receipts, incidents } = state

  const [filters,       setFilters]       = useState<Filters>(DEFAULT_FILTERS)
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)
  const [drillDown,     setDrillDown]     = useState<DrillDownState | null>(null)

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const cutoff = startOf(filters.dateRange)
    return orders.filter(o => {
      if (cutoff && new Date(o.createdAt).getTime() < cutoff) return false
      if (filters.cityId   !== 'all' && o.cityId            !== filters.cityId)   return false
      if (filters.driverId !== 'all' && o.assignedDriverId  !== filters.driverId) return false
      if (filters.status   !== 'all' && o.status            !== filters.status)   return false
      return true
    })
  }, [orders, filters])

  const filteredReceipts = useMemo(() => {
    const orderIds = new Set(filteredOrders.map(o => o.id))
    return receipts.filter(r => orderIds.has(r.orderId))
  }, [filteredOrders, receipts])

  const filteredIncidents = useMemo(() => {
    const orderIds = new Set(filteredOrders.map(o => o.id))
    return incidents.filter(i => orderIds.has(i.orderId))
  }, [filteredOrders, incidents])

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const delivered     = filteredOrders.filter(o => o.status === 'delivered')
  const cancelled     = filteredOrders.filter(o => o.status === 'cancelled')
  const totalRevenue  = filteredReceipts.reduce((s, r) => s + r.total, 0)
  const totalTips     = filteredReceipts.reduce((s, r) => s + r.tip, 0)
  const cancelRate    = filteredOrders.length ? `${((cancelled.length / filteredOrders.length) * 100).toFixed(0)}%` : '0%'
  const openIncidents = filteredIncidents.filter(i => ['new','in_review','escalated'].includes(i.status)).length
  const avgOrderValue = filteredReceipts.length ? totalRevenue / filteredReceipts.length : 0

  // Distinct cities in filtered data
  const cities = useMemo(() => [...new Set(orders.map(o => o.cityId))].sort(), [orders])

  // ── Drill-down handler ──────────────────────────────────────────────────────
  const handleDrillDown = useCallback((dd: DrillDownState) => {
    setDrillDown(prev => prev?.label === dd.label ? null : dd)
  }, [])

  // ── Card toggle ─────────────────────────────────────────────────────────────
  const toggleSection = (s: ActiveSection) => {
    setActiveSection(prev => prev === s ? null : s)
    setDrillDown(null)
  }

  const isFiltered = filters.dateRange !== 'all' || filters.cityId !== 'all'
    || filters.driverId !== 'all' || filters.status !== 'all'

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Analytics</div>
        <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
          {isFiltered
            ? `Showing ${filteredOrders.length} of ${orders.length} orders · filters active`
            : `All ${orders.length} orders · ${drivers.length} drivers · ${receipts.length} receipts`}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar filters={filters} setFilters={setFilters} drivers={drivers} cities={cities} />

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 0, flexWrap: 'wrap' }}>
        <SummaryCard
          id="revenue" label="Total Revenue" value={fmt(totalRevenue)}
          sub={`avg ${fmt(avgOrderValue)} / order`}
          active={activeSection === 'revenue'} onClick={() => toggleSection('revenue')}
        />
        <SummaryCard
          id="deliveries" label="Deliveries" value={delivered.length}
          sub={`${cancelRate} cancel rate`}
          active={activeSection === 'deliveries'} onClick={() => toggleSection('deliveries')}
        />
        <SummaryCard
          id="tips" label="Tips Collected" value={fmt(totalTips)}
          sub={`${filteredReceipts.length} receipts`}
          active={activeSection === 'tips'} onClick={() => toggleSection('tips')}
        />
        <SummaryCard
          id="incidents" label="Open Incidents" value={openIncidents}
          sub={`${filteredIncidents.length} total filed`}
          active={activeSection === 'incidents'} onClick={() => toggleSection('incidents')}
        />
      </div>

      {/* Expanded card detail section */}
      <div style={{
        maxHeight: activeSection ? '600px' : '0',
        opacity: activeSection ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.2s ease',
        marginTop: activeSection ? 0 : 0,
      }}>
        <div style={{
          border: '1.5px solid var(--a-accent)', borderTop: 'none',
          borderRadius: '0 0 12px 12px', background: 'var(--a-surface)',
          marginBottom: 28,
        }}>
          {activeSection === 'revenue'    && <RevenueDetail    orders={filteredOrders} receipts={filteredReceipts} drivers={drivers} />}
          {activeSection === 'deliveries' && <DeliveriesDetail orders={filteredOrders} onDrillDown={handleDrillDown} />}
          {activeSection === 'tips'       && <TipsDetail       orders={filteredOrders} receipts={filteredReceipts} />}
          {activeSection === 'incidents'  && <IncidentsDetail  orders={filteredOrders} incidents={filteredIncidents} onDrillDown={handleDrillDown} />}
        </div>
      </div>
      {!activeSection && <div style={{ marginBottom: 28 }} />}

      {/* Drill-down panel (from card sections) */}
      {drillDown && (
        <div style={{ marginBottom: 28 }}>
          <DrillDownPanel state={drillDown} onClose={() => setDrillDown(null)} />
        </div>
      )}

      {/* Delivery trend */}
      <DeliveryTrend
        orders={filteredOrders}
        dateRange={filters.dateRange}
        onDrillDown={handleDrillDown}
      />

      {/* Drill-down from trend */}
      {drillDown && drillDown.orders && drillDown.orders.length > 0 && !activeSection && (
        <div style={{ marginBottom: 28 }}>
          <DrillDownPanel state={drillDown} onClose={() => setDrillDown(null)} />
        </div>
      )}

      {/* Two-column lower sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Top cities */}
        <Section title="Orders by city" count={filteredOrders.length}>
          {(() => {
            const byCity: Record<string, number> = {}
            filteredOrders.forEach(o => { byCity[o.cityId] = (byCity[o.cityId] ?? 0) + 1 })
            const entries = Object.entries(byCity).sort((a, b) => b[1] - a[1])
            const max = entries[0]?.[1] ?? 1
            return entries.length === 0
              ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--a-muted)', fontSize: 13 }}>No data.</div>
              : <div style={{ padding: '0 16px' }}>
                  {entries.map(([city, count]) => (
                    <BarRow
                      key={city}
                      label={city.charAt(0).toUpperCase() + city.slice(1)}
                      value={`${count} (${pct(count, filteredOrders.length)})`}
                      bar={count} barMax={max}
                      onClick={() => handleDrillDown({
                        label: `Orders in ${city.charAt(0).toUpperCase() + city.slice(1)}`,
                        orders: filteredOrders.filter(o => o.cityId === city),
                      })}
                    />
                  ))}
                </div>
          })()}
        </Section>

        {/* Parcel size */}
        <Section title="Parcel sizes">
          {(() => {
            const sizes = [
              { label: 'Small',  key: 's', count: filteredOrders.filter(o => o.parcel.size === 's').length },
              { label: 'Medium', key: 'm', count: filteredOrders.filter(o => o.parcel.size === 'm').length },
              { label: 'Large',  key: 'l', count: filteredOrders.filter(o => o.parcel.size === 'l').length },
            ]
            const max = Math.max(...sizes.map(s => s.count), 1)
            const fragile = filteredOrders.filter(o => o.parcel.fragile).length
            return (
              <div style={{ padding: '0 16px' }}>
                {sizes.map(s => (
                  <BarRow
                    key={s.key}
                    label={s.label}
                    value={`${s.count} (${pct(s.count, filteredOrders.length)})`}
                    bar={s.count} barMax={max}
                    onClick={() => handleDrillDown({
                      label: `${s.label} parcel orders`,
                      orders: filteredOrders.filter(o => o.parcel.size === s.key),
                    })}
                  />
                ))}
                <BarRow
                  label="Fragile"
                  value={`${fragile} (${pct(fragile, filteredOrders.length)})`}
                  bar={fragile} barMax={filteredOrders.length || 1}
                  color="#f59e0b"
                  onClick={() => handleDrillDown({
                    label: 'Fragile orders',
                    orders: filteredOrders.filter(o => o.parcel.fragile),
                  })}
                />
              </div>
            )
          })()}
        </Section>
      </div>

      {/* Drill-down from lower sections */}
      {drillDown && (
        <div style={{ marginBottom: 28 }}>
          <DrillDownPanel state={drillDown} onClose={() => setDrillDown(null)} />
        </div>
      )}

      {/* Top drivers table */}
      <TopDriversTable
        orders={filteredOrders}
        drivers={drivers}
        receipts={filteredReceipts}
        onDrillDown={handleDrillDown}
      />

      {/* Incident analytics */}
      <IncidentAnalytics
        incidents={filteredIncidents}
        drivers={drivers}
        onDrillDown={handleDrillDown}
      />
    </div>
  )
}
