import React, { useState, useEffect } from 'react'
import { useDriver } from '../store/DriverContext'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'
import { ScreenHeader } from '../ui'
import { NAV_APPS, getNavApp, setNavApp, type NavApp } from '../lib/navigation'

interface Props {
  onBack: () => void
  onSignOut: () => void
}

const VEHICLE_OPTIONS = ['Cargo Bike', 'Scooter', 'Motorcycle', 'Car', 'Cargo Van', 'Box Truck']

function stars(r: number) {
  const full = Math.round(r)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

/** Which maps app "Navigate" opens. Chosen on first use; changeable here. */
function NavigationAppSetting() {
  const [app, setApp] = useState<NavApp | null>(() => getNavApp())
  return (
    <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 12 }}>Navigation app</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ id: null, label: 'Ask each time' }, ...NAV_APPS].map(o => {
          const on = app === o.id
          return (
            <button
              key={o.label}
              onClick={() => { setNavApp(o.id as NavApp | null); setApp(o.id as NavApp | null) }}
              style={{
                height: 36, padding: '0 14px', borderRadius: 18, cursor: 'pointer', fontSize: 13, fontWeight: on ? 650 : 500,
                border: on ? 'none' : '1px solid var(--d-border)',
                background: on ? 'var(--d-ink)' : 'var(--d-surface)', color: on ? 'var(--d-bg)' : 'var(--d-ink)',
              }}
            >{o.label}</button>
          )
        })}
      </div>
    </div>
  )
}

/** In-app account deletion (Apple 5.1.1(v)). See migration 023. */
function DeleteAccountSection({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [err,        setErr]        = useState<string | null>(null)

  const del = async () => {
    setErr(null)
    setLoading(true)
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) {
        setErr(error.message.includes('active_delivery')
          ? 'Finish or hand back your current delivery before deleting your account.'
          : 'Could not delete your account. Please try again.')
        setLoading(false)
        return
      }
      onDeleted()
    } catch {
      setErr('Could not delete your account. Please try again.')
      setLoading(false)
    }
  }

  const btn: React.CSSProperties = {
    flex: 1, height: 44, borderRadius: 12, fontFamily: 'var(--d-font)', fontSize: 14,
    cursor: loading ? 'default' : 'pointer',
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: '6px 0',
          fontFamily: 'var(--d-font)', fontSize: 13, color: 'var(--d-muted)', cursor: 'pointer',
        }}
      >
        Delete account
      </button>
    )
  }

  return (
    <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--d-ink)', marginBottom: 4 }}>Delete your driver account?</div>
      <div style={{ fontSize: 13, color: 'var(--d-muted)', lineHeight: 1.5, marginBottom: 12 }}>
        This permanently deletes your CitySend driver account, profile and location data. It can't be undone.
        Records of past deliveries are kept, without your personal details, for accounting purposes.
      </div>
      {err && <div style={{ fontSize: 13, color: 'var(--d-err)', marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { setConfirming(false); setErr(null) }}
          disabled={loading}
          style={{ ...btn, border: '1px solid var(--d-border)', background: 'var(--d-surface)', color: 'var(--d-ink)', fontWeight: 500 }}
        >
          Cancel
        </button>
        <button
          onClick={del}
          disabled={loading}
          style={{ ...btn, border: 'none', background: 'var(--d-err)', color: '#fff', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </div>
  )
}

export function DriverProfileScreen({ onBack, onSignOut }: Props) {
  const { state, dispatch } = useDriver()
  const { auth }  = state

  const [editing,      setEditing]      = useState(false)
  const [phone,        setPhone]        = useState(auth?.phone    ?? '')
  const [vehicle,      setVehicle]      = useState(auth?.vehicle  ?? '')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [loadingFresh, setLoadingFresh] = useState(false)

  useEffect(() => {
    if (!auth || !isSupabaseConfigured) return
    setLoadingFresh(true)
    Promise.resolve(
      supabase.from('drivers').select('*').eq('id', auth.driverId).maybeSingle()
    ).then(({ data }) => {
      if (data) {
        dispatch({ type: 'LOGIN', auth: {
          ...auth,
          phone:           data.phone ?? auth.phone,
          vehicle:         data.vehicle ?? auth.vehicle,
          rating:          Number(data.rating) || auth.rating,
          completedOrders: data.completed_orders ?? auth.completedOrders,
        }})
        setPhone(data.phone ?? '')
        setVehicle(data.vehicle ?? '')
      }
    })
    .catch(() => {})
    .finally(() => setLoadingFresh(false))
  }, [auth?.driverId])

  if (!auth) return null

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (isSupabaseConfigured) {
        const { error: dbErr } = await supabase
          .from('drivers')
          .update({ phone: phone.trim(), vehicle: vehicle.trim() })
          .eq('id', auth.driverId)
        if (dbErr) throw new Error(dbErr.message)
      }
      setSaved(true)
      // Update local auth state so UI reflects changes without re-login
      if (state.auth) {
        dispatch({ type: 'LOGIN', auth: { ...state.auth, phone: phone.trim(), vehicle: vehicle.trim() } })
      }
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPhone(auth.phone ?? '')
    setVehicle(auth.vehicle ?? '')
    setEditing(false)
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--d-bg)', color: 'var(--d-ink)',
      display: 'flex', flexDirection: 'column',
    }}>
      <ScreenHeader title="Profile" onBack={onBack} />

      {/* Body */}
      <div className="d-stack" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar + name card */}
        <div style={{
          background: 'var(--d-surface)', border: '1px solid var(--d-border)',
          borderRadius: 16, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--d-accent), #e06840)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
            margin: '0 auto 14px',
            boxShadow: '0 4px 16px rgba(201,74,27,.35)',
          }}>
            {auth.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--d-ink)', marginBottom: 4 }}>
            {auth.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--d-muted)', marginBottom: 12 }}>
            {auth.email}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--d-ink)' }}>{auth.rating.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: '#f59e0b' }}>{stars(auth.rating)}</div>
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 2 }}>Rating</div>
            </div>
            <div style={{ width: 1, background: 'var(--d-border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--d-ink)' }}>{auth.completedOrders}</div>
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 2 }}>Deliveries</div>
            </div>
          </div>
        </div>

        {/* Editable info */}
        <div style={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Section header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--d-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-ink)' }}>Contact & Vehicle</div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--d-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--d-font)' }}
              >
                Edit
              </button>
            )}
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Phone */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Phone
              </div>
              {editing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="204 555 0000"
                  autoComplete="tel"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                    border: '1.5px solid var(--d-border)', background: 'var(--d-bg)',
                    color: 'var(--d-ink)', fontFamily: 'var(--d-font)', fontSize: 15,
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{ fontSize: 15, color: 'var(--d-ink)' }}>
                  {auth.phone || <span style={{ color: 'var(--d-muted)' }}>Not set</span>}
                </div>
              )}
            </div>

            {/* Vehicle */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Vehicle
              </div>
              {editing ? (
                <select
                  value={vehicle}
                  onChange={e => setVehicle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
                    border: '1.5px solid var(--d-border)', background: 'var(--d-bg)',
                    color: 'var(--d-ink)', fontFamily: 'var(--d-font)', fontSize: 15,
                    outline: 'none', appearance: 'none',
                  }}
                >
                  <option value="">Select vehicle type</option>
                  {VEHICLE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 15, color: 'var(--d-ink)' }}>
                  {auth.vehicle || <span style={{ color: 'var(--d-muted)' }}>Not set</span>}
                </div>
              )}
            </div>

            {/* Driver ID (read-only) */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Driver ID
              </div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--d-muted)' }}>{auth.driverId}</div>
            </div>
          </div>

          {/* Edit actions */}
          {editing && (
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, height: 46, borderRadius: 12, border: 'none',
                  background: saving ? 'var(--d-border)' : 'var(--d-accent)',
                  color: '#fff', fontFamily: 'var(--d-font)', fontSize: 15, fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                style={{
                  height: 46, padding: '0 18px', borderRadius: 12,
                  border: '1px solid var(--d-border)', background: 'transparent',
                  color: 'var(--d-muted)', fontFamily: 'var(--d-font)', fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {error && (
            <div style={{ margin: '0 16px 16px', padding: '10px 12px', background: 'rgba(185,28,28,.1)', borderRadius: 8, fontSize: 13, color: 'var(--d-err)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Saved toast */}
        {saved && (
          <div style={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            background: '#166534', color: '#fff', borderRadius: 99,
            padding: '10px 20px', fontSize: 14, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,.3)', zIndex: 200,
          }}>
            ✓ Profile updated
          </div>
        )}

        <NavigationAppSetting />

        {/* Sign out */}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: '1px solid rgba(185,28,28,.3)',
            background: 'rgba(185,28,28,.08)',
            color: 'var(--d-err)', fontFamily: 'var(--d-font)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginTop: 8,
          }}
        >
          Sign out
        </button>

        {isSupabaseConfigured && <DeleteAccountSection onDeleted={onSignOut} />}

        {/* Legal */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 8 }}>
          {([
            { label: 'Privacy Policy',   url: 'https://www.citysend.ca/privacy' },
            { label: 'Terms of Service', url: 'https://www.citysend.ca/terms'   },
          ] as const).map(({ label, url }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--d-muted)', textDecoration: 'none', fontFamily: 'var(--d-font)' }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
