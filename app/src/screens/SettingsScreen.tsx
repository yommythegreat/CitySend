import React, { useState, useEffect } from 'react'
import { IconButton } from '../components/IconButton'
import { Back, Bell, Card, Lock, Chevron, Check, Plus, X } from '../components/Icons'
import { AddrIcon, ADDR_ICONS, ICON_LABELS } from '../components/AddrIcon'
import { getAllCities } from '../utils/serviceAvailability'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { CityConfig } from '../config/cityConfig'
import type { AppState, AuthUser, CityId, PaymentMethod, SavedAddress, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  onCityChange: (cityId: CityId) => void
  configs: CityConfig[]
  user?: AuthUser | null
}

type Panel = 'main' | 'payment' | 'addresses' | 'security' | 'city'

// ── Shared primitives ──────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'var(--cs-slate-100)', margin: '0 16px' }} />
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>
      {label}
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 13, padding: 2, border: 'none', cursor: 'pointer', flexShrink: 0, background: on ? 'var(--cs-ink)' : 'var(--cs-slate-200)', transition: 'background .18s', display: 'flex' }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: '#fff', transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .18s' }} />
    </button>
  )
}

function RowBtn({ label, sub, onClick, danger }: { label: string; sub?: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--cs-font)', textAlign: 'left' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: danger ? 'var(--cs-err)' : 'var(--cs-ink)' }}>{label}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>{sub}</div>}
      </div>
      {onClick && !danger && <Chevron size={14} color="var(--cs-slate-400)" />}
    </button>
  )
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      <IconButton onClick={onBack}><Back /></IconButton>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{title}</div>
    </div>
  )
}

function StatusBanner({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ padding: '10px 14px', background: ok ? 'rgba(22,107,58,.08)' : 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: ok ? 'var(--cs-ok)' : 'var(--cs-err)', lineHeight: 1.4, marginBottom: 16 }}>
      {msg}
    </div>
  )
}

const BRAND_LABELS: Record<PaymentMethod['brand'], string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' }

// ── Payment panel ──────────────────────────────────────────────────────────
// Cards are managed by Stripe — we never store card details locally.
// This panel is informational only; card data lives in Stripe's vault.

function PaymentPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="cs-screen cs-enter-right">
      <PanelHeader title="Payment methods" onBack={onBack} />
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={20} color="var(--cs-slate-500)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)' }}>Managed by Stripe</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>Your card details are stored securely by Stripe — not by CitySend.</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', lineHeight: 1.55, paddingTop: 4, borderTop: '1px solid var(--cs-slate-100)' }}>
              To update or remove a saved card, use the secure payment form at checkout. CitySend never stores raw card numbers on its servers.
            </div>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}

// ── Addresses panel ────────────────────────────────────────────────────────

function AddressesPanel({ state, setState, onBack }: { state: AppState; setState: Props['setState']; onBack: () => void }) {
  const [editing,   setEditing]   = useState<number | null>(null) // index
  const [adding,    setAdding]    = useState(false)
  const [label,     setLabel]     = useState('')
  const [address,   setAddress]   = useState('')
  const [icon,      setIcon]      = useState<SavedAddress['icon']>('pin')
  const [defaultIdx, setDefaultIdx] = useState(0)
  const [ok,        setOk]        = useState<string | null>(null)
  const [err,       setErr]       = useState<string | null>(null)

  const addrs = state.savedAddresses

  const startEdit = (i: number) => {
    const a = addrs[i]
    setLabel(a.label); setAddress(a.address); setIcon(a.icon)
    setEditing(i); setAdding(false)
  }

  const startAdd = () => {
    setLabel(''); setAddress(''); setIcon('pin')
    setAdding(true); setEditing(null)
  }

  const cancel = () => { setAdding(false); setEditing(null); setErr(null) }

  const validate = () => {
    if (!label.trim()) { setErr('Enter a label.'); return false }
    if (!address.trim()) { setErr('Enter an address.'); return false }
    return true
  }

  const save = () => {
    if (!validate()) return
    if (adding) {
      setState(s => ({ ...s, savedAddresses: [...s.savedAddresses, { label: label.trim(), address: address.trim(), icon }] }))
      setOk('Address added.'); setTimeout(() => setOk(null), 2500)
    } else if (editing !== null) {
      setState(s => { const a = [...s.savedAddresses]; a[editing] = { label: label.trim(), address: address.trim(), icon }; return { ...s, savedAddresses: a } })
      setOk('Address updated.'); setTimeout(() => setOk(null), 2500)
    }
    cancel()
  }

  const remove = (i: number) => {
    if (i === defaultIdx) setDefaultIdx(0)
    setState(s => { const a = [...s.savedAddresses]; a.splice(i, 1); return { ...s, savedAddresses: a } })
    setOk('Address removed.'); setTimeout(() => setOk(null), 2500)
  }

  const FormPanel = (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Icon</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ADDR_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)} style={{ flex: 1, padding: '9px 0', border: `1.5px solid ${icon === ic ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`, borderRadius: 10, background: icon === ic ? 'var(--cs-ink)' : '#fff', color: icon === ic ? '#fff' : 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {ICON_LABELS[ic]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Label</div>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Home, Studio…" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--cs-slate-200)', borderRadius: 10, fontSize: 15, fontFamily: 'var(--cs-font)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Address</div>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="134 Princess St" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--cs-slate-200)', borderRadius: 10, fontSize: 15, fontFamily: 'var(--cs-font)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {err && <div style={{ fontSize: 13, color: 'var(--cs-err)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={cancel} style={{ flex: 1, padding: '12px 0', border: '1.5px solid var(--cs-slate-200)', borderRadius: 12, background: '#fff', fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'var(--cs-slate-600)' }}>Cancel</button>
        <button onClick={save}   style={{ flex: 2, padding: '12px 0', border: 'none', borderRadius: 12, background: 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>{adding ? 'Add address' : 'Save changes'}</button>
      </div>
    </div>
  )

  return (
    <div className="cs-screen cs-enter-right">
      <PanelHeader title="Saved addresses" onBack={onBack} />
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>
          {ok && <StatusBanner msg={ok} ok={true} />}

          {addrs.length > 0 && (
            <>
              <SectionHeader label="Your places" />
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
                {addrs.map((a, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    {editing === i ? (
                      <div style={{ padding: 14 }}>{FormPanel}</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AddrIcon icon={a.icon} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {a.label}
                            {i === defaultIdx && <span style={{ fontSize: 10, fontFamily: 'var(--cs-mono)', background: 'var(--cs-ink)', color: '#fff', padding: '2px 6px', borderRadius: 99, letterSpacing: 0.5 }}>DEFAULT</span>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.address}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {i !== defaultIdx && (
                            <button onClick={() => setDefaultIdx(i)} title="Set as default pickup" style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, border: '1px solid var(--cs-slate-200)', background: '#fff', cursor: 'pointer', fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-600)', whiteSpace: 'nowrap' }}>
                              Default
                            </button>
                          )}
                          <button onClick={() => startEdit(i)} style={{ width: 28, height: 28, borderRadius: 14, border: '1px solid var(--cs-slate-200)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-600)' }}>
                            Edit
                          </button>
                          <button onClick={() => remove(i)} style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(179,38,30,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <X size={13} color="var(--cs-err)" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {adding && (
            <>
              <SectionHeader label="New address" />
              {FormPanel}
            </>
          )}

          {!adding && editing === null && (
            <button onClick={startAdd} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', border: '1px dashed var(--cs-slate-200)', borderRadius: 16, cursor: 'pointer', fontFamily: 'var(--cs-font)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={16} />
              </div>
              <div style={{ fontSize: 15, color: 'var(--cs-slate-500)' }}>Add an address</div>
            </button>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}

// ── Security panel ─────────────────────────────────────────────────────────

function SecurityPanel({ onBack, goForgot }: { onBack: () => void; goForgot: () => void }) {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [ok,       setOk]       = useState<string | null>(null)
  const [err,      setErr]      = useState<string | null>(null)

  const submit = async () => {
    setErr(null); setOk(null)
    if (!current.trim())          { setErr('Enter your current password.'); return }
    if (next.length < 6)          { setErr('New password must be at least 6 characters.'); return }
    if (next !== confirm)         { setErr('Passwords do not match.'); return }
    if (next === current)         { setErr('New password must be different from current.'); return }
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: next })
        if (error) { setErr(error.message); setLoading(false); return }
      }
      setCurrent(''); setNext(''); setConfirm('')
      setOk('Password changed successfully.')
    } catch {
      setErr('Could not change password. Try again.')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid var(--cs-slate-200)',
    borderRadius: 10, fontSize: 15, fontFamily: 'var(--cs-font)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div className="cs-screen cs-enter-right">
      <PanelHeader title="Change password" onBack={onBack} />
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>
          {ok  && <StatusBanner msg={ok}  ok={true}  />}
          {err && <StatusBanner msg={err} ok={false} />}

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Current password</div>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Your current password" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>New password</div>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="6+ characters" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Confirm new password</div>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" style={inputStyle} />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 14, background: loading ? 'var(--cs-slate-200)' : 'var(--cs-ink)', color: loading ? 'var(--cs-slate-400)' : '#fff', fontFamily: 'var(--cs-font)', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginBottom: 16 }}
          >
            {loading ? 'Saving…' : 'Change password'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button onClick={goForgot} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)' }}>
              Forgot your password?
            </button>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}

// ── City panel ─────────────────────────────────────────────────────────────

function CityPanel({
  currentCityId,
  onCityChange,
  onBack,
  configs,
}: {
  currentCityId: CityId
  onCityChange: (id: CityId) => void
  onBack: () => void
  configs: CityConfig[]
}) {
  const cities = getAllCities(configs)

  return (
    <div className="cs-screen cs-enter-right">
      <PanelHeader title="Delivery city" onBack={onBack} />
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>
          <SectionHeader label="Select city" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            {cities.map((c, i) => (
              <div key={c.cityId}>
                {i > 0 && <Divider />}
                <button
                  onClick={() => { if (c.isLive) onCityChange(c.cityId) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 14, padding: '14px 16px',
                    background: 'transparent', border: 'none',
                    cursor: c.isLive ? 'pointer' : 'default',
                    fontFamily: 'var(--cs-font)', textAlign: 'left',
                  }}
                >
                  {/* Live indicator */}
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

                  {c.cityId === currentCityId && (
                    <Check size={15} color="var(--cs-ok)" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(11,18,32,.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--cs-slate-500)', lineHeight: 1.5 }}>
              Your city affects pricing, tax rates, and service availability.
              Coming-soon cities can be browsed but orders cannot be placed.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main settings screen ───────────────────────────────────────────────────

const notifPrefsKey = (userId: string) => `cs_notif_prefs_${userId}`

export function SettingsScreen({ go, state, setState, onCityChange, configs, user }: Props) {
  const [panel, setPanel] = useState<Panel>('main')

  // ── Notification preferences — persisted to user-scoped localStorage ────────
  const [notifDelivery, setNotifDelivery] = useState(true)
  const [notifPromos,   setNotifPromos]   = useState(false)
  const [notifSMS,      setNotifSMS]      = useState(true)

  const userId = user?.id
  useEffect(() => {
    if (!userId || userId === 'guest') return
    try {
      const raw = localStorage.getItem(notifPrefsKey(userId))
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.delivery === 'boolean') setNotifDelivery(p.delivery)
        if (typeof p.promos   === 'boolean') setNotifPromos(p.promos)
        if (typeof p.sms      === 'boolean') setNotifSMS(p.sms)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const saveNotifPref = (key: 'delivery' | 'promos' | 'sms', value: boolean) => {
    if (!userId || userId === 'guest') return
    try {
      const raw = localStorage.getItem(notifPrefsKey(userId))
      const prev = raw ? JSON.parse(raw) : {}
      localStorage.setItem(notifPrefsKey(userId), JSON.stringify({ ...prev, [key]: value }))
    } catch {}
  }

  const isGuest = user?.id === 'guest'

  if (panel === 'payment')   return <PaymentPanel   onBack={() => setPanel('main')} />
  if (panel === 'addresses') return <AddressesPanel state={state} setState={setState} onBack={() => setPanel('main')} />
  if (panel === 'security')  return <SecurityPanel  onBack={() => setPanel('main')} goForgot={() => go('forgot-password')} />
  if (panel === 'city')      return (
    <CityPanel
      currentCityId={state.selectedCityId}
      onCityChange={(id) => { onCityChange(id); setState(s => ({ ...s, selectedCityId: id })) }}
      onBack={() => setPanel('main')}
      configs={configs}
    />
  )

  const allCities = getAllCities(configs)
  const currentCity = allCities.find(c => c.cityId === state.selectedCityId)
  const citySub = currentCity
    ? `${currentCity.cityName}, ${currentCity.province}${currentCity.isLive ? ' · Live' : ' · Coming soon'}`
    : `${allCities[0].cityName}, ${allCities[0].province} · Live`

  // ── Guest-simplified panel ─────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="cs-screen cs-enter-right">
        <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <IconButton onClick={() => go('profile')}><Back /></IconButton>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Settings</div>
        </div>

        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ paddingTop: 24 }}>

            <SectionHeader label="Delivery area" />
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
              <RowBtn label="Current city" sub={citySub} onClick={() => setPanel('city')} />
            </div>

            {/* Locked sections — guest teaser */}
            {(['Payment methods', 'Saved places', 'Account & security'] as const).map((label) => (
              <div key={label} style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 10 }}>
                <button
                  onClick={() => go('auth')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--cs-font)', textAlign: 'left' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-slate-400)' }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--cs-accent)', marginTop: 1 }}>Create an account to unlock →</div>
                  </div>
                  <Lock size={15} color="var(--cs-slate-300)" />
                </button>
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.8 }}>CITYSEND v1.1.0 · citysend.ca</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Full registered panel ──────────────────────────────────────────────────

  const defaultCard = state.paymentMethods.find(m => m.isDefault)
  const cardSub = defaultCard ? `${BRAND_LABELS[defaultCard.brand]} •••• ${defaultCard.last4} · default` : 'No saved cards'
  const addrSub = state.savedAddresses.length > 0
    ? state.savedAddresses.map(a => a.label).join(', ')
    : 'No saved addresses'

  return (
    <div className="cs-screen cs-enter-right">
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('profile')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Settings</div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>

          <SectionHeader label="Notifications" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>Delivery updates</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Pickup, transit, and delivery alerts</div>
              </div>
              <Toggle on={notifDelivery} onToggle={() => { setNotifDelivery(v => { saveNotifPref('delivery', !v); return !v }) }} />
            </div>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>SMS notifications</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Text messages to your phone</div>
              </div>
              <Toggle on={notifSMS} onToggle={() => { setNotifSMS(v => { saveNotifPref('sms', !v); return !v }) }} />
            </div>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>Promotions</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Deals and CitySend news</div>
              </div>
              <Toggle on={notifPromos} onToggle={() => { setNotifPromos(v => { saveNotifPref('promos', !v); return !v }) }} />
            </div>
          </div>

          <SectionHeader label="Delivery area" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            <RowBtn label="Current city" sub={citySub} onClick={() => setPanel('city')} />
          </div>

          <SectionHeader label="Payment" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            <RowBtn label="Payment methods" sub={cardSub} onClick={() => setPanel('payment')} />
            <Divider />
            <RowBtn label="Billing history" sub="View past receipts" onClick={() => go('billing')} />
          </div>

          <SectionHeader label="Addresses" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            <RowBtn label="Manage saved places" sub={addrSub} onClick={() => setPanel('addresses')} />
          </div>

          <SectionHeader label="Account & security" />
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
            <RowBtn label="Change password" onClick={() => setPanel('security')} />
            <Divider />
            <RowBtn label="Two-factor authentication" sub="Not enabled" onClick={() => {}} />
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.8 }}>CITYSEND v1.1.0 · citysend.ca</div>
          </div>
        </div>
      </div>
    </div>
  )
}
