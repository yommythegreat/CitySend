import React, { useState } from 'react'
import { useDriver } from '../store/DriverContext'
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase'

interface Props {
  onBack: () => void
  onSignOut: () => void
}

const VEHICLE_OPTIONS = ['Cargo Bike', 'Scooter', 'Motorcycle', 'Car', 'Cargo Van', 'Box Truck']

function stars(r: number) {
  const full = Math.round(r)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export function DriverProfileScreen({ onBack, onSignOut }: Props) {
  const { state } = useDriver()
  const { auth }  = state

  const [editing,  setEditing]  = useState(false)
  const [phone,    setPhone]    = useState(auth?.phone    ?? '')
  const [vehicle,  setVehicle]  = useState(auth?.vehicle  ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

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
      {/* Header */}
      <div style={{
        background: '#111827', flexShrink: 0,
        paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
        paddingBottom: 20, paddingLeft: 20, paddingRight: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBack}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>My Profile</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar + name card */}
        <div style={{
          background: 'var(--d-surface)', border: '1px solid var(--d-border)',
          borderRadius: 16, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c94a1b, #e06840)',
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
            <div style={{ margin: '0 16px 16px', padding: '10px 12px', background: 'rgba(185,28,28,.1)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
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

        {/* Sign out */}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: '1px solid rgba(185,28,28,.3)',
            background: 'rgba(185,28,28,.08)',
            color: '#ef4444', fontFamily: 'var(--d-font)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', marginTop: 8,
          }}
        >
          Sign out
        </button>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
