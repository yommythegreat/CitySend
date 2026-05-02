import React, { useState } from 'react'
import { IconButton } from '../components/IconButton'
import { Back, Bell, Card, Home as HomeIcon, Lock, Chevron, Check, Plus, X, Pin, Package } from '../components/Icons'
import { getAllCities } from '../utils/serviceAvailability'
import type { AppState, CityId, PaymentMethod, SavedAddress, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  onLogout: () => void
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  onCityChange: (cityId: CityId) => void
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

function PaymentPanel({ state, setState, onBack, goForgot }: { state: AppState; setState: Props['setState']; onBack: () => void; goForgot: () => void }) {
  const [adding, setAdding] = useState(false)
  const [brand,  setBrand]  = useState<PaymentMethod['brand']>('visa')
  const [last4,  setLast4]  = useState('')
  const [expiry, setExpiry] = useState('')
  const [err,    setErr]    = useState<string | null>(null)
  const [ok,     setOk]     = useState<string | null>(null)

  const methods = state.paymentMethods

  const setDefault = (id: string) => {
    setState(s => ({ ...s, paymentMethods: s.paymentMethods.map(m => ({ ...m, isDefault: m.id === id })) }))
    setOk('Default payment method updated.')
    setTimeout(() => setOk(null), 2500)
  }

  const remove = (id: string) => {
    const m = methods.find(m => m.id === id)
    if (m?.isDefault) { setErr("Can't remove default card. Set another card as default first."); setTimeout(() => setErr(null), 3000); return }
    setState(s => ({ ...s, paymentMethods: s.paymentMethods.filter(m => m.id !== id) }))
  }

  const addCard = () => {
    const l = last4.replace(/\D/g, '')
    const e = expiry.trim()
    if (l.length !== 4) { setErr('Enter the last 4 digits of your card.'); return }
    if (!/^\d{2}\/\d{2}$/.test(e)) { setErr('Enter expiry as MM/YY.'); return }
    const newMethod: PaymentMethod = { id: `pm_${Date.now()}`, brand, last4: l, expiry: e, isDefault: methods.length === 0 }
    setState(s => ({ ...s, paymentMethods: [...s.paymentMethods, newMethod] }))
    setAdding(false); setLast4(''); setExpiry(''); setErr(null)
    setOk('Card added.'); setTimeout(() => setOk(null), 2500)
  }

  return (
    <div className="cs-screen cs-enter-right">
      <PanelHeader title="Payment methods" onBack={onBack} />
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 24 }}>
          {ok  && <StatusBanner msg={ok}  ok={true}  />}
          {err && <StatusBanner msg={err} ok={false} />}

          {/* Saved cards */}
          {methods.length > 0 && (
            <>
              <SectionHeader label="Saved cards" />
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 16 }}>
                {methods.map((m, i) => (
                  <div key={m.id}>
                    {i > 0 && <Divider />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                      <div style={{ width: 40, height: 28, borderRadius: 6, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Card size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {BRAND_LABELS[m.brand]} •••• {m.last4}
                          {m.isDefault && <span style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', background: 'var(--cs-ink)', color: '#fff', padding: '2px 7px', borderRadius: 99, letterSpacing: 0.5 }}>DEFAULT</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Expires {m.expiry}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!m.isDefault && (
                          <button onClick={() => setDefault(m.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 99, border: '1px solid var(--cs-slate-200)', background: '#fff', cursor: 'pointer', fontFamily: 'var(--cs-font)', color: 'var(--cs-ink)', whiteSpace: 'nowrap' }}>
                            Set default
                          </button>
                        )}
                        <button onClick={() => remove(m.id)} style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'rgba(179,38,30,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={13} color="var(--cs-err)" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add card */}
          <SectionHeader label="Add new card" />
          {!adding ? (
            <button onClick={() => setAdding(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', border: '1px dashed var(--cs-slate-200)', borderRadius: 16, cursor: 'pointer', fontFamily: 'var(--cs-font)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={16} />
              </div>
              <div style={{ fontSize: 15, color: 'var(--cs-slate-500)' }}>Add a card</div>
            </button>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Card brand</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['visa', 'mastercard', 'amex'] as PaymentMethod['brand'][]).map(b => (
                    <button key={b} onClick={() => setBrand(b)} style={{ flex: 1, padding: '9px 0', border: `1.5px solid ${brand === b ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`, borderRadius: 10, background: brand === b ? 'var(--cs-ink)' : '#fff', color: brand === b ? '#fff' : 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      {BRAND_LABELS[b]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Last 4 digits</div>
                <input value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="4242" maxLength={4} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--cs-slate-200)', borderRadius: 10, fontSize: 15, fontFamily: 'var(--cs-font)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Expiry (MM/YY)</div>
                <input value={expiry} onChange={e => { let v = e.target.value.replace(/[^\d/]/g,''); if (v.length === 2 && !v.includes('/')) v += '/'; setExpiry(v.slice(0,5)) }} placeholder="12/27" maxLength={5} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--cs-slate-200)', borderRadius: 10, fontSize: 15, fontFamily: 'var(--cs-font)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setAdding(false); setErr(null) }} style={{ flex: 1, padding: '12px 0', border: '1.5px solid var(--cs-slate-200)', borderRadius: 12, background: '#fff', fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'var(--cs-slate-600)' }}>Cancel</button>
                <button onClick={addCard} style={{ flex: 2, padding: '12px 0', border: 'none', borderRadius: 12, background: 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#fff' }}>Add card</button>
              </div>
            </div>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}

// ── Addresses panel ────────────────────────────────────────────────────────

const ADDR_ICONS: SavedAddress['icon'][] = ['home', 'package', 'pin']
const ICON_LABELS: Record<SavedAddress['icon'], string> = { home: 'Home', package: 'Work', pin: 'Other' }

function AddrIcon({ icon, size = 16 }: { icon: SavedAddress['icon']; size?: number }) {
  if (icon === 'home')    return <HomeIcon size={size} />
  if (icon === 'package') return <Package size={size} />
  return <Pin size={size} />
}

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
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setCurrent(''); setNext(''); setConfirm('')
    setOk('Password changed successfully.')
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
}: {
  currentCityId: CityId
  onCityChange: (id: CityId) => void
  onBack: () => void
}) {
  const cities = getAllCities()

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

export function SettingsScreen({ go, onLogout, state, setState, onCityChange }: Props) {
  const [panel, setPanel] = useState<Panel>('main')
  const [notifDelivery, setNotifDelivery] = useState(true)
  const [notifPromos,   setNotifPromos]   = useState(false)
  const [notifSMS,      setNotifSMS]      = useState(true)

  if (panel === 'payment')   return <PaymentPanel   state={state} setState={setState} onBack={() => setPanel('main')} goForgot={() => go('forgot-password')} />
  if (panel === 'addresses') return <AddressesPanel state={state} setState={setState} onBack={() => setPanel('main')} />
  if (panel === 'security')  return <SecurityPanel  onBack={() => setPanel('main')} goForgot={() => go('forgot-password')} />
  if (panel === 'city')      return (
    <CityPanel
      currentCityId={state.selectedCityId}
      onCityChange={(id) => { onCityChange(id); setState(s => ({ ...s, selectedCityId: id })) }}
      onBack={() => setPanel('main')}
    />
  )

  const defaultCard = state.paymentMethods.find(m => m.isDefault)
  const cardSub = defaultCard ? `${BRAND_LABELS[defaultCard.brand]} •••• ${defaultCard.last4} · default` : 'No saved cards'
  const addrSub = state.savedAddresses.length > 0
    ? state.savedAddresses.map(a => a.label).join(', ')
    : 'No saved addresses'

  const allCities = getAllCities()
  const currentCity = allCities.find(c => c.cityId === state.selectedCityId)
  const citySub = currentCity
    ? `${currentCity.cityName}, ${currentCity.province}${currentCity.isLive ? ' · Live' : ' · Coming soon'}`
    : `${allCities[0].cityName}, ${allCities[0].province} · Live`

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
              <Toggle on={notifDelivery} onToggle={() => setNotifDelivery(v => !v)} />
            </div>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>SMS notifications</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Text messages to your phone</div>
              </div>
              <Toggle on={notifSMS} onToggle={() => setNotifSMS(v => !v)} />
            </div>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>Promotions</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 1 }}>Deals and CitySend news</div>
              </div>
              <Toggle on={notifPromos} onToggle={() => setNotifPromos(v => !v)} />
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

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden', marginBottom: 8 }}>
            <RowBtn label="Log out" danger onClick={onLogout} />
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', letterSpacing: 0.8 }}>CITYSEND v1.1.0 · citysend.ca</div>
          </div>
        </div>
      </div>
    </div>
  )
}
