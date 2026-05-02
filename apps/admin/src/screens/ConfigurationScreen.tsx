import React, { useState } from 'react'
import { useAdminStore }  from '../store/AdminContext'
import { resetSystemCityConfigs } from '@shared/utils/configStore'
import type { CityConfig, CityPricing, TaxRates, ServiceHours, DeliveryRules, CancellationRules } from '@shared/config/cityConfig'

// ── Tab types ──────────────────────────────────────────────────────────────────

type ConfigTab = 'cities' | 'pricing' | 'taxes' | 'hours' | 'delivery'

const TABS: { id: ConfigTab; label: string; icon: string }[] = [
  { id: 'cities',   label: 'City Management',  icon: '🏙️' },
  { id: 'pricing',  label: 'Pricing',          icon: '💰' },
  { id: 'taxes',    label: 'Tax Rates',        icon: '🧾' },
  { id: 'hours',    label: 'Service Hours',    icon: '🕐' },
  { id: 'delivery', label: 'Delivery Rules',   icon: '📏' },
]

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const WEEKDAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number) { return `${(n * 100).toFixed(3).replace(/\.?0+$/, '')}%` }

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--a-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, step = 0.01, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width: '100%', padding: '6px 10px',
        border: '1.5px solid var(--a-border)', borderRadius: 6,
        fontSize: 13, outline: 'none', background: '#fff',
      }}
    />
  )
}

function StrInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '6px 10px',
        border: '1.5px solid var(--a-border)', borderRadius: 6,
        fontSize: 13, outline: 'none', background: '#fff',
      }}
    />
  )
}

// ── City selector (left rail used in most tabs) ───────────────────────────────

function CityRail({ configs, selected, onSelect }: {
  configs: CityConfig[]; selected: string; onSelect: (id: string) => void
}) {
  return (
    <div style={{ width: 180, flexShrink: 0 }}>
      {configs.map(c => (
        <button
          key={c.cityId}
          onClick={() => onSelect(c.cityId)}
          style={{
            width: '100%', padding: '9px 12px', marginBottom: 4,
            border: 'none', borderRadius: 7, textAlign: 'left', cursor: 'pointer',
            background: selected === c.cityId ? 'var(--a-sidebar)' : 'transparent',
            color: selected === c.cityId ? '#fff' : 'var(--a-ink)',
            fontSize: 13, fontWeight: selected === c.cityId ? 600 : 400,
          }}
        >
          <div>{c.cityName}</div>
          <div style={{ fontSize: 11, marginTop: 1, opacity: 0.65 }}>
            {c.isLive ? '● Live' : '○ Coming Soon'}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--a-surface)', border: '1px solid var(--a-border)',
      borderRadius: 10, padding: '18px 20px', marginBottom: 16,
    }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
          textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 14,
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}

// ── Save button ───────────────────────────────────────────────────────────────

function SaveBtn({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 20px', border: 'none', borderRadius: 7,
        background: saved ? 'var(--a-ok)' : 'var(--a-accent)',
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >{saved ? '✓ Saved' : 'Save Changes'}</button>
  )
}

// ── Tab: Cities ───────────────────────────────────────────────────────────────

function CitiesTab() {
  const { state, dispatch } = useAdminStore()

  const toggle = (cityId: string, current: boolean) => {
    dispatch({
      type: 'UPDATE_CITY_CONFIG', cityId,
      patch: { isLive: !current, launchStatus: !current ? 'live' : 'coming-soon' },
    })
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 20, marginTop: 0 }}>
        Enable or disable cities. Customers in a disabled city are shown the "Coming Soon" screen
        and cannot place orders.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {state.cityConfigs.map(c => (
          <div
            key={c.cityId}
            style={{
              background: 'var(--a-surface)', border: `1.5px solid ${c.isLive ? 'var(--a-ok)' : 'var(--a-border)'}`,
              borderRadius: 10, padding: '16px 18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--a-ink)' }}>{c.cityName}</div>
                <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 1 }}>{c.province}</div>
              </div>
              <button
                onClick={() => toggle(c.cityId, c.isLive)}
                style={{
                  padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
                  background: c.isLive ? 'var(--a-ok-bg)' : 'var(--a-bg)',
                  color: c.isLive ? 'var(--a-ok)' : 'var(--a-muted)',
                  fontSize: 12, fontWeight: 600,
                  border: `1px solid ${c.isLive ? 'var(--a-ok)' : 'var(--a-border)'}`,
                }}
              >{c.isLive ? 'Live' : 'Coming Soon'}</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--a-muted)' }}>{c.coverageNotes}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--a-border)' }}>
        <button
          onClick={() => {
            if (window.confirm('Reset all configurations to factory defaults? This cannot be undone.')) {
              dispatch({ type: 'RESET_CITY_CONFIGS' })
              resetSystemCityConfigs()
            }
          }}
          style={{
            padding: '7px 16px', border: '1.5px solid var(--a-border)',
            borderRadius: 7, background: 'transparent',
            color: 'var(--a-muted)', fontSize: 13, cursor: 'pointer',
          }}
        >Reset to Defaults</button>
        <span style={{ fontSize: 12, color: 'var(--a-muted)', marginLeft: 12 }}>
          Changes take effect immediately in the Customer App.
        </span>
      </div>
    </div>
  )
}

// ── Tab: Pricing ──────────────────────────────────────────────────────────────

function PricingTab() {
  const { state, dispatch } = useAdminStore()
  const [selected, setSelected] = useState<string>(state.cityConfigs[0]?.cityId ?? '')
  const [saved, setSaved] = useState(false)
  const city = state.cityConfigs.find(c => c.cityId === selected)

  const [draft, setDraft] = useState<CityPricing | null>(null)
  const p: CityPricing = draft ?? city?.pricing ?? {} as CityPricing

  const update = (patch: Partial<CityPricing>) => {
    setDraft({ ...p, ...patch })
    setSaved(false)
  }

  const handleCityChange = (id: string) => {
    setSelected(id)
    setDraft(null)
    setSaved(false)
  }

  const save = () => {
    if (!draft) return
    dispatch({ type: 'UPDATE_CITY_CONFIG', cityId: selected, patch: { pricing: draft } })
    setDraft(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!city) return null

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <CityRail configs={state.cityConfigs} selected={selected} onSelect={handleCityChange} />
      <div style={{ flex: 1 }}>
        <Card title="Base Fee Structure">
          <FieldRow label="Base Fee ($)" hint="Flat fee up to base distance">
            <NumInput value={p.baseFee} onChange={v => update({ baseFee: v })} step={0.5} />
          </FieldRow>
          <FieldRow label="Base Distance (km)" hint="Km covered by base fee">
            <NumInput value={p.baseDistanceKm} onChange={v => update({ baseDistanceKm: v })} step={1} min={1} />
          </FieldRow>
          <FieldRow label="Extra per km ($)" hint="Charged per km beyond base distance">
            <NumInput value={p.extraKmFee} onChange={v => update({ extraKmFee: v })} step={0.25} />
          </FieldRow>
        </Card>
        <Card title="Package Size Fees">
          <FieldRow label="Small Package ($)">
            <NumInput value={p.smallPackageFee} onChange={v => update({ smallPackageFee: v })} step={0.5} />
          </FieldRow>
          <FieldRow label="Medium Package ($)">
            <NumInput value={p.mediumPackageFee} onChange={v => update({ mediumPackageFee: v })} step={0.5} />
          </FieldRow>
          <FieldRow label="Large Package ($)">
            <NumInput value={p.largePackageFee} onChange={v => update({ largePackageFee: v })} step={0.5} />
          </FieldRow>
        </Card>
        <Card title="Special Handling">
          <FieldRow label="Fragile Handling ($)" hint="Surcharge for fragile items">
            <NumInput value={p.fragileFee} onChange={v => update({ fragileFee: v })} step={0.5} />
          </FieldRow>
        </Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SaveBtn onClick={save} saved={saved} />
          {!saved && draft && (
            <span style={{ fontSize: 12, color: 'var(--a-warn)' }}>Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Tax Rates ────────────────────────────────────────────────────────────

function TaxTab() {
  const { state, dispatch } = useAdminStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaxRates | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const startEdit = (c: CityConfig) => {
    setEditing(c.cityId)
    setDraft({ ...c.taxRates })
    setSaved(null)
  }

  const save = (cityId: string) => {
    if (!draft) return
    dispatch({ type: 'UPDATE_CITY_CONFIG', cityId, patch: { taxRates: draft } })
    setEditing(null)
    setDraft(null)
    setSaved(cityId)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 20, marginTop: 0 }}>
        Tax rates are applied to the subtotal before tip. GST and PST are used in most provinces;
        HST replaces both in ON/NB/NS/NL/PEI; QST is Quebec-specific.
      </p>
      <table className="a-table">
        <thead>
          <tr>
            <th>City</th>
            <th>Province</th>
            <th>GST</th>
            <th>PST</th>
            <th>HST</th>
            <th>QST</th>
            <th>Combined</th>
            <th style={{ width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {state.cityConfigs.map(c => {
            const isEdit = editing === c.cityId
            const t = isEdit && draft ? draft : c.taxRates
            const total = t.gst + t.pst + t.hst + t.qst
            return (
              <tr key={c.cityId}>
                <td style={{ fontWeight: 500 }}>{c.cityName}</td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>{c.province}</td>
                {(['gst', 'pst', 'hst', 'qst'] as (keyof TaxRates)[]).map(field => (
                  <td key={field}>
                    {isEdit ? (
                      <input
                        type="number"
                        value={t[field]}
                        step={0.00001}
                        min={0}
                        max={1}
                        onChange={e => setDraft(d => ({ ...d!, [field]: parseFloat(e.target.value) || 0 }))}
                        style={{
                          width: 80, padding: '4px 8px',
                          border: '1.5px solid var(--a-accent)', borderRadius: 5,
                          fontSize: 12, outline: 'none',
                        }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--a-mono)', fontSize: 12 }}>
                        {t[field] > 0 ? pct(t[field]) : <span style={{ color: 'var(--a-muted)' }}>—</span>}
                      </span>
                    )}
                  </td>
                ))}
                <td style={{ fontFamily: 'var(--a-mono)', fontSize: 12, fontWeight: 600 }}>
                  {pct(total)}
                </td>
                <td>
                  {isEdit ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => save(c.cityId)} style={{ padding: '4px 10px', border: 'none', borderRadius: 5, background: 'var(--a-ok)', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Save</button>
                      <button onClick={() => { setEditing(null); setDraft(null) }} style={{ padding: '4px 10px', border: '1px solid var(--a-border)', borderRadius: 5, background: 'transparent', color: 'var(--a-muted)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(c)}
                      style={{ padding: '4px 10px', border: '1px solid var(--a-border)', borderRadius: 5, background: 'transparent', color: 'var(--a-ink)', fontSize: 11, cursor: 'pointer' }}
                    >{saved === c.cityId ? '✓ Saved' : 'Edit'}</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: Service Hours ────────────────────────────────────────────────────────

function HoursTab() {
  const { state, dispatch } = useAdminStore()
  const [selected, setSelected] = useState<string>(state.cityConfigs[0]?.cityId ?? '')
  const [draft, setDraft] = useState<ServiceHours | null>(null)
  const [saved, setSaved] = useState(false)
  const city = state.cityConfigs.find(c => c.cityId === selected)

  const h: ServiceHours = draft ?? city?.serviceHours ?? {} as ServiceHours

  const update = (patch: Partial<ServiceHours>) => {
    setDraft({ ...h, ...patch })
    setSaved(false)
  }

  const toggleDay = (day: string) => {
    const days = h.daysActive.includes(day as any)
      ? h.daysActive.filter(d => d !== day)
      : [...h.daysActive, day as any]
    update({ daysActive: days })
  }

  const handleCityChange = (id: string) => {
    setSelected(id)
    setDraft(null)
    setSaved(false)
  }

  const save = () => {
    if (!draft) return
    dispatch({ type: 'UPDATE_CITY_CONFIG', cityId: selected, patch: { serviceHours: draft } })
    setDraft(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!city) return null

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <CityRail configs={state.cityConfigs} selected={selected} onSelect={handleCityChange} />
      <div style={{ flex: 1 }}>
        <Card title="Operating Hours">
          <FieldRow label="Opens at" hint="24-hour local time (HH:MM)">
            <input
              type="time"
              value={h.open}
              onChange={e => update({ open: e.target.value })}
              style={{ padding: '6px 10px', border: '1.5px solid var(--a-border)', borderRadius: 6, fontSize: 13, outline: 'none' }}
            />
          </FieldRow>
          <FieldRow label="Closes at" hint="24-hour local time (HH:MM)">
            <input
              type="time"
              value={h.close}
              onChange={e => update({ close: e.target.value })}
              style={{ padding: '6px 10px', border: '1.5px solid var(--a-border)', borderRadius: 6, fontSize: 13, outline: 'none' }}
            />
          </FieldRow>
          <FieldRow label="Timezone" hint="IANA timezone identifier">
            <StrInput value={h.timezone} onChange={v => update({ timezone: v })} />
          </FieldRow>
        </Card>
        <Card title="Active Days">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WEEKDAYS.map(day => {
              const active = h.daysActive?.includes(day)
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '7px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
                    background: active ? 'var(--a-accent)' : 'var(--a-bg)',
                    color: active ? '#fff' : 'var(--a-muted)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                  }}
                >{WEEKDAY_LABELS[day]}</button>
              )
            })}
          </div>
        </Card>
        <Card title="Operational Metrics (display only)">
          <FieldRow label="Avg Pickup (min)" hint="Shown in customer trust strip">
            <NumInput
              value={city.avgPickupMinutes}
              onChange={v => dispatch({ type: 'UPDATE_CITY_CONFIG', cityId: selected, patch: { avgPickupMinutes: v } })}
              step={1} min={1}
            />
          </FieldRow>
          <FieldRow label="On-Time %" hint='e.g. "98.4%" — shown in trust strip'>
            <StrInput
              value={city.onTimePercent}
              onChange={v => dispatch({ type: 'UPDATE_CITY_CONFIG', cityId: selected, patch: { onTimePercent: v } })}
            />
          </FieldRow>
        </Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SaveBtn onClick={save} saved={saved} />
          {!saved && draft && <span style={{ fontSize: 12, color: 'var(--a-warn)' }}>Unsaved changes</span>}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Delivery & Cancellation Rules ────────────────────────────────────────

function DeliveryTab() {
  const { state, dispatch } = useAdminStore()
  const [selected, setSelected] = useState<string>(state.cityConfigs[0]?.cityId ?? '')
  const [draftD, setDraftD] = useState<DeliveryRules | null>(null)
  const [draftC, setDraftC] = useState<CancellationRules | null>(null)
  const [saved, setSaved] = useState(false)
  const city = state.cityConfigs.find(c => c.cityId === selected)

  const d: DeliveryRules    = draftD ?? city?.deliveryRules    ?? {} as DeliveryRules
  const c: CancellationRules = draftC ?? city?.cancellationRules ?? {} as CancellationRules

  const updD = (patch: Partial<DeliveryRules>)      => { setDraftD({ ...d, ...patch }); setSaved(false) }
  const updC = (patch: Partial<CancellationRules>)  => { setDraftC({ ...c, ...patch }); setSaved(false) }

  const handleCityChange = (id: string) => {
    setSelected(id)
    setDraftD(null)
    setDraftC(null)
    setSaved(false)
  }

  const save = () => {
    const patch: Partial<typeof city> = {}
    if (draftD) patch.deliveryRules    = draftD
    if (draftC) patch.cancellationRules = draftC
    if (Object.keys(patch).length === 0) return
    dispatch({ type: 'UPDATE_CITY_CONFIG', cityId: selected, patch })
    setDraftD(null)
    setDraftC(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!city) return null

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <FieldRow label={label}>
      <button
        onClick={() => onChange(!value)}
        style={{
          padding: '5px 16px', borderRadius: 999, cursor: 'pointer',
          background: value ? 'var(--a-ok-bg)' : 'var(--a-bg)',
          color: value ? 'var(--a-ok)' : 'var(--a-muted)',
          fontSize: 12, fontWeight: 600,
          border: `1px solid ${value ? 'var(--a-ok)' : 'var(--a-border)'}`,
        }}
      >{value ? 'Yes' : 'No'}</button>
    </FieldRow>
  )

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <CityRail configs={state.cityConfigs} selected={selected} onSelect={handleCityChange} />
      <div style={{ flex: 1 }}>
        <Card title="Parcel Limits">
          <FieldRow label="Max Weight (kg)">
            <NumInput value={d.maxWeightKg} onChange={v => updD({ maxWeightKg: v })} step={1} min={1} />
          </FieldRow>
          <FieldRow label="Max Length (cm)">
            <NumInput value={d.maxDimensionsCm?.[0] ?? 0} onChange={v => updD({ maxDimensionsCm: [v, d.maxDimensionsCm[1], d.maxDimensionsCm[2]] })} step={5} min={1} />
          </FieldRow>
          <FieldRow label="Max Width (cm)">
            <NumInput value={d.maxDimensionsCm?.[1] ?? 0} onChange={v => updD({ maxDimensionsCm: [d.maxDimensionsCm[0], v, d.maxDimensionsCm[2]] })} step={5} min={1} />
          </FieldRow>
          <FieldRow label="Max Height (cm)">
            <NumInput value={d.maxDimensionsCm?.[2] ?? 0} onChange={v => updD({ maxDimensionsCm: [d.maxDimensionsCm[0], d.maxDimensionsCm[1], v] })} step={5} min={1} />
          </FieldRow>
        </Card>
        <Card title="Delivery Requirements">
          <Toggle label="Proof of Delivery" value={d.proofOfDeliveryRequired} onChange={v => updD({ proofOfDeliveryRequired: v })} />
          <Toggle label="Signature Required" value={d.signatureRequired} onChange={v => updD({ signatureRequired: v })} />
          <Toggle label="Age Verification" value={d.ageVerificationAvailable} onChange={v => updD({ ageVerificationAvailable: v })} />
        </Card>
        <Card title="Cancellation & Refund Policy">
          <FieldRow label="Free Window (min)" hint="Minutes after booking to cancel for free">
            <NumInput value={c.freeWindowMinutes} onChange={v => updC({ freeWindowMinutes: v })} step={1} min={0} />
          </FieldRow>
          <FieldRow label="Refund Before Pickup (%)" hint="% of order total refunded pre-pickup">
            <NumInput value={c.refundPctBeforePickup} onChange={v => updC({ refundPctBeforePickup: v })} step={5} min={0} />
          </FieldRow>
          <Toggle label="Allow Refund After Pickup" value={c.allowRefundAfterPickup} onChange={v => updC({ allowRefundAfterPickup: v })} />
          {c.allowRefundAfterPickup && (
            <FieldRow label="Refund After Pickup (%)" hint="% refunded if allowed post-pickup">
              <NumInput value={c.refundPctAfterPickup} onChange={v => updC({ refundPctAfterPickup: v })} step={5} min={0} />
            </FieldRow>
          )}
          <Toggle label="Require Cancellation Reason" value={c.requireReason} onChange={v => updC({ requireReason: v })} />
        </Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SaveBtn onClick={save} saved={saved} />
          {!saved && (draftD || draftC) && <span style={{ fontSize: 12, color: 'var(--a-warn)' }}>Unsaved changes</span>}
        </div>
      </div>
    </div>
  )
}

// ── Root screen ───────────────────────────────────────────────────────────────

export function ConfigurationScreen() {
  const [tab, setTab] = useState<ConfigTab>('cities')

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>
          Configuration
        </div>
        <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
          Admin-managed system settings. Changes are applied immediately to the Customer App.
        </div>
      </div>

      {/* Architecture notice */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fbbf24',
        borderRadius: 8, padding: '10px 14px', marginBottom: 20,
        fontSize: 12, color: '#92400e',
      }}>
        <strong>MVP mode:</strong> Configuration is persisted to localStorage and shared with the
        Customer App in the same browser session.{' '}
        <span style={{ opacity: 0.7 }}>
          In production this will be stored in the backend database and distributed via API.
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--a-border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '9px 16px', border: 'none', borderRadius: '7px 7px 0 0',
              background: tab === t.id ? 'var(--a-surface)' : 'transparent',
              borderBottom: tab === t.id ? '2px solid var(--a-accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--a-ink)' : 'var(--a-muted)',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'cities'   && <CitiesTab />}
      {tab === 'pricing'  && <PricingTab />}
      {tab === 'taxes'    && <TaxTab />}
      {tab === 'hours'    && <HoursTab />}
      {tab === 'delivery' && <DeliveryTab />}
    </div>
  )
}
