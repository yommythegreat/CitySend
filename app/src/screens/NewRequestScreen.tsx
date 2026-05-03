import React, { useState } from 'react'
import { Steps } from '../components/Steps'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { AddressField } from '../components/AddressField'
import { IconButton } from '../components/IconButton'
import { Arrow, Back, User, Phone, Home as HomeIcon, Package, Pin, Repeat } from '../components/Icons'
import { formatPhone, sanitizeText } from '../utils/format'
import { isStepValid, getPickupErrors, getDropoffErrors, type PickupErrors, type DropoffErrors } from '../utils/validation'
import type { CityConfig } from '../config/cityConfig'
import type { Draft, AppState, ScreenName, NavOptions } from '../types'

interface Props {
  step: 'new-1' | 'new-2' | 'new-3'
  go: (screen: ScreenName, opts?: NavOptions) => void
  state: AppState
  draft: Draft
  setDraft: (d: Draft) => void
  cityConfig: CityConfig
}

const STEP_IDX: Record<string, number> = { 'new-1': 0, 'new-2': 1, 'new-3': 2 }
const STEP_LABELS = ['Pickup', 'Drop-off', 'Parcel']
const STEP_TITLES = [
  'Where should we grab it?',
  "Who's receiving it?",
  'Tell us what it is.',
]

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px',
    border: `1px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
    background: active ? 'var(--cs-ink)' : '#fff',
    color: active ? '#fff' : 'var(--cs-ink)',
    borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'var(--cs-font)',
  }
}

/** Inline field error message */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div style={{
      fontSize: 12, color: 'var(--cs-err)',
      marginTop: 4, paddingLeft: 2, lineHeight: 1.4,
    }}>
      {msg}
    </div>
  )
}

// ── Pickup step ───────────────────────────────────────────────────────────────

type PickupTouched = Partial<Record<keyof PickupErrors, boolean>>
type DropoffTouched = Partial<Record<keyof DropoffErrors, boolean>>

function PickupStep({
  state, draft, setDraft, cityConfig, errors, touched, onTouch,
}: {
  state: AppState
  draft: Draft
  setDraft: (d: Draft) => void
  cityConfig: CityConfig
  errors: PickupErrors
  touched: PickupTouched
  onTouch: (field: keyof PickupErrors) => void
}) {
  // Show error only when field is touched
  const e = {
    address: touched.address ? errors.address : undefined,
    name:    touched.name    ? errors.name    : undefined,
    phone:   touched.phone   ? errors.phone   : undefined,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <AddressField
          label="Pickup address"
          value={draft.pickup.address}
          onChange={(addr, coords) => setDraft({
            ...draft,
            pickup: { ...draft.pickup, address: sanitizeText(addr), lat: coords?.lat, lng: coords?.lng },
          })}
          onBlur={() => onTouch('address')}
          placeholder="134 Princess St"
          cityConfig={cityConfig}
          error={!!e.address}
        />
        <FieldError msg={e.address} />
      </div>
      <Field
        label="Unit / buzzer (optional)"
        value={draft.pickup.unit}
        placeholder="Apt 4B"
        onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, unit: sanitizeText(v) } })}
      />
      <div>
        <Field
          label="Contact name"
          value={draft.pickup.name}
          icon={<User size={18} />}
          onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, name: sanitizeText(v) } })}
          onBlur={() => onTouch('name')}
          placeholder="Your name"
          error={e.name}
        />
        <FieldError msg={e.name} />
      </div>
      <div>
        <Field
          label="Phone"
          value={draft.pickup.phone}
          icon={<Phone size={18} />}
          type="tel"
          onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, phone: formatPhone(v) } })}
          onBlur={() => onTouch('phone')}
          placeholder="204 555 0100"
          error={e.phone}
        />
        <FieldError msg={e.phone} />
      </div>

      <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6 }}>
        Saved places
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {state.savedAddresses.map((a, i) => (
          <button
            key={i}
            onClick={() => setDraft({ ...draft, pickup: { ...draft.pickup, address: a.address, unit: '', lat: undefined, lng: undefined } })}
            style={chipStyle(draft.pickup.address === a.address)}
          >
            {a.icon === 'home' ? <HomeIcon size={14} /> : a.icon === 'package' ? <Package size={14} /> : <Pin size={14} />}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Drop-off step ─────────────────────────────────────────────────────────────

function DropoffStep({
  state, draft, setDraft, cityConfig, errors, touched, onTouch,
}: {
  state: AppState
  draft: Draft
  setDraft: (d: Draft) => void
  cityConfig: CityConfig
  errors: DropoffErrors
  touched: DropoffTouched
  onTouch: (field: keyof DropoffErrors) => void
}) {
  const e = {
    name:    touched.name    ? errors.name    : undefined,
    phone:   touched.phone   ? errors.phone   : undefined,
    address: touched.address ? errors.address : undefined,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Field
          label="Receiver name"
          value={draft.dropoff.name}
          icon={<User size={18} />}
          onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, name: sanitizeText(v) } })}
          onBlur={() => onTouch('name')}
          placeholder="Full name"
          error={e.name}
        />
        <FieldError msg={e.name} />
      </div>
      <div>
        <Field
          label="Phone"
          value={draft.dropoff.phone}
          icon={<Phone size={18} />}
          type="tel"
          onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, phone: formatPhone(v) } })}
          onBlur={() => onTouch('phone')}
          placeholder="204 555 0100"
          error={e.phone}
        />
        <FieldError msg={e.phone} />
      </div>
      <div>
        <AddressField
          label="Drop-off address"
          value={draft.dropoff.address}
          onChange={(addr, coords) => setDraft({
            ...draft,
            dropoff: { ...draft.dropoff, address: sanitizeText(addr), lat: coords?.lat, lng: coords?.lng },
          })}
          onBlur={() => onTouch('address')}
          placeholder="88 Osborne St"
          cityConfig={cityConfig}
          error={!!e.address}
        />
        <FieldError msg={e.address} />
      </div>
      <Field
        label="Note for the courier"
        value={draft.dropoff.note}
        placeholder="Leave at the front desk"
        onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, note: sanitizeText(v) } })}
      />

      {/* Recent recipients chips */}
      {state.pastDeliveries.filter(d => d.status === 'delivered').length > 0 && (
        <>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6 }}>
            Recent recipients
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {state.pastDeliveries.filter(d => d.status === 'delivered').slice(0, 3).map((d, i) => (
              <button
                key={i}
                onClick={() => setDraft({
                  ...draft,
                  dropoff: { ...draft.dropoff, name: d.to.name, address: d.to.address, phone: d.to.phone ?? '', lat: undefined, lng: undefined },
                })}
                style={chipStyle(draft.dropoff.name === d.to.name)}
              >
                <Repeat size={12} /> {d.to.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Parcel step ───────────────────────────────────────────────────────────────

function ParcelStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const SIZES = [
    { v: 's' as const, l: 'Small',  d: 'Envelope, keys, documents' },
    { v: 'm' as const, l: 'Medium', d: 'Shoebox — up to 10 lb' },
    { v: 'l' as const, l: 'Large',  d: 'Backpack-ish — up to 30 lb' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          Parcel size
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SIZES.map((s) => {
            const active = draft.parcel.size === s.v
            return (
              <button
                key={s.v}
                onClick={() => setDraft({ ...draft, parcel: { ...draft.parcel, size: s.v } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  background: '#fff',
                  border: `1.5px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                  border: `2px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-300)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--cs-ink)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{s.l}</div>
                  <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{s.d}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Field
        label="What's inside?"
        value={draft.parcel.desc}
        placeholder="Birthday cake"
        onChange={(v) => setDraft({ ...draft, parcel: { ...draft.parcel, desc: sanitizeText(v) } })}
      />

      <button
        onClick={() => setDraft({ ...draft, parcel: { ...draft.parcel, fragile: !draft.parcel.fragile } })}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 14,
          background: '#fff', border: '1px solid var(--cs-slate-200)', borderRadius: 12,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
        }}
      >
        <div style={{
          width: 44, height: 26, borderRadius: 13, padding: 2, flexShrink: 0,
          background: draft.parcel.fragile ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
          transition: 'background .18s', display: 'flex',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: '#fff',
            transform: draft.parcel.fragile ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform .18s',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>Fragile</div>
          <div style={{ fontSize: 12, color: 'var(--cs-slate-500)' }}>Handled with extra care</div>
        </div>
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function NewRequestScreen({ step, go, state, draft, setDraft, cityConfig }: Props) {
  const stepIdx = STEP_IDX[step]
  const isLast  = stepIdx === 2
  const valid   = isStepValid(step, draft)

  // Per-step touched state — errors only show after the user leaves a field
  const [pickupTouched,  setPickupTouched]  = useState<PickupTouched>({})
  const [dropoffTouched, setDropoffTouched] = useState<DropoffTouched>({})

  const touchPickup  = (field: keyof PickupErrors)  => setPickupTouched(t => ({ ...t, [field]: true }))
  const touchDropoff = (field: keyof DropoffErrors) => setDropoffTouched(t => ({ ...t, [field]: true }))

  // Raw errors (used to compute per-field visibility based on touched)
  const rawPickupErrors  = getPickupErrors(draft)
  const rawDropoffErrors = getDropoffErrors(draft)

  const next = () => {
    if (!valid) return   // button is disabled; guard keeps keyboard/a11y safe too
    if (stepIdx < 2) go(`new-${stepIdx + 2}` as ScreenName)
    else go('pricing')
  }

  const back = () => {
    // Clear touched state so returning to a step feels fresh
    setPickupTouched({})
    setDropoffTouched({})
    if (stepIdx === 0) go('home')
    else go(`new-${stepIdx}` as ScreenName)
  }

  return (
    <div className="cs-screen cs-enter-right">
      <div style={{ padding: '56px 20px 10px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={back}><Back /></IconButton>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Steps total={3} current={stepIdx} />
        </div>
        <div style={{ width: 40, fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', textAlign: 'right' }}>
          {stepIdx + 1}/3
        </div>
      </div>

      <div style={{ padding: '20px 20px 14px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {STEP_LABELS[stepIdx]}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, marginTop: 6, color: 'var(--cs-ink)' }}>
          {STEP_TITLES[stepIdx]}
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none', overflowX: 'visible' }}>
        {stepIdx === 0 && (
          <PickupStep
            state={state} draft={draft} setDraft={setDraft}
            cityConfig={cityConfig}
            errors={rawPickupErrors}
            touched={pickupTouched}
            onTouch={touchPickup}
          />
        )}
        {stepIdx === 1 && (
          <DropoffStep
            state={state} draft={draft} setDraft={setDraft}
            cityConfig={cityConfig}
            errors={rawDropoffErrors}
            touched={dropoffTouched}
            onTouch={touchDropoff}
          />
        )}
        {stepIdx === 2 && <ParcelStep draft={draft} setDraft={setDraft} />}
        <div style={{ height: 20 }} />
      </div>

      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff', flexShrink: 0 }}>
        <Button kind="ink" size="lg" full onClick={next} disabled={!valid}
          icon={valid ? <Arrow color="#fff" size={18} /> : undefined}>
          {isLast ? 'Review & price' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
