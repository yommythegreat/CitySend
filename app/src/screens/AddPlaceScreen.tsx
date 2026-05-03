import React, { useState } from 'react'
import { IconButton } from '../components/IconButton'
import { Back, Home as HomeIcon, Package, Pin, Check } from '../components/Icons'
import type { AppState, SavedAddress, ScreenName } from '../types'

interface Props {
  go: (screen: ScreenName) => void
  setState: React.Dispatch<React.SetStateAction<AppState>>
}

const ADDR_ICONS: SavedAddress['icon'][] = ['home', 'package', 'pin']
const ICON_LABELS: Record<SavedAddress['icon'], string> = {
  home:    'Home',
  package: 'Work',
  pin:     'Other',
}

function AddrIcon({ icon, size = 14 }: { icon: SavedAddress['icon']; size?: number }) {
  if (icon === 'home')    return <HomeIcon size={size} />
  if (icon === 'package') return <Package size={size} />
  return <Pin size={size} />
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div style={{ fontSize: 12, color: 'var(--cs-err)', marginTop: 4, paddingLeft: 2, lineHeight: 1.4 }}>
      {msg}
    </div>
  )
}

export function AddPlaceScreen({ go, setState }: Props) {
  const [label,        setLabel]        = useState('')
  const [address,      setAddress]      = useState('')
  const [icon,         setIcon]         = useState<SavedAddress['icon']>('pin')
  const [saved,        setSaved]        = useState(false)
  const [labelTouched, setLabelTouched] = useState(false)
  const [addrTouched,  setAddrTouched]  = useState(false)

  // Derived validation
  const labelErr   = !label.trim()   ? 'Enter a label for this place.' : undefined
  const addressErr = !address.trim() ? 'Enter a street address.'       : undefined
  const isValid    = !labelErr && !addressErr

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${hasError ? 'var(--cs-err)' : 'var(--cs-slate-200)'}`,
    borderRadius: 10, fontSize: 15,
    fontFamily: 'var(--cs-font)', outline: 'none',
    boxSizing: 'border-box', color: 'var(--cs-ink)',
    background: '#fff',
    transition: 'border-color .15s',
  })

  const save = () => {
    if (!isValid || saved) return

    setState(s => ({
      ...s,
      savedAddresses: [
        ...s.savedAddresses,
        { label: label.trim(), address: address.trim(), icon },
      ],
    }))

    setSaved(true)
    setTimeout(() => go('home'), 1100)
  }

  return (
    <div className="cs-screen cs-enter-up">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Add a place</div>
      </div>

      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ paddingTop: 28 }}>

          {/* Success banner */}
          {saved && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', background: 'rgba(22,107,58,.08)',
              borderRadius: 12, fontSize: 14, color: 'var(--cs-ok)',
              fontWeight: 500, marginBottom: 20,
            }}>
              <Check size={16} color="var(--cs-ok)" />
              Place saved! Taking you home…
            </div>
          )}

          {/* Form */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid var(--cs-slate-100)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 18,
          }}>

            {/* Type picker */}
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Type
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {ADDR_ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    style={{
                      flex: 1, padding: '10px 0',
                      border: `1.5px solid ${icon === ic ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                      borderRadius: 10,
                      background: icon === ic ? 'var(--cs-ink)' : '#fff',
                      color:      icon === ic ? '#fff'          : 'var(--cs-ink)',
                      fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      transition: 'background .15s, border-color .15s',
                    }}
                  >
                    <AddrIcon icon={ic} size={13} />
                    {ICON_LABELS[ic]}
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Label
              </div>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                onBlur={() => setLabelTouched(true)}
                placeholder="e.g. Home, Studio, Mom's…"
                style={inputStyle(labelTouched && !!labelErr)}
                autoComplete="off"
              />
              {labelTouched && <FieldError msg={labelErr} />}
            </div>

            {/* Address */}
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                Address
              </div>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                onBlur={() => setAddrTouched(true)}
                placeholder="123 Main St"
                style={inputStyle(addrTouched && !!addressErr)}
                autoComplete="street-address"
              />
              {addrTouched && <FieldError msg={addressErr} />}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={!isValid || saved}
            style={{
              width: '100%', marginTop: 16, padding: '15px 0',
              border: 'none', borderRadius: 14,
              background: saved
                ? 'var(--cs-ok)'
                : !isValid
                  ? 'var(--cs-slate-150, #e8ebf0)'
                  : 'var(--cs-ink)',
              color: (!isValid && !saved) ? 'var(--cs-slate-400)' : '#fff',
              fontFamily: 'var(--cs-font)',
              fontSize: 15, fontWeight: 600,
              cursor: (!isValid || saved) ? 'default' : 'pointer',
              transition: 'background .2s, color .2s',
            }}
          >
            {saved ? '✓ Saved' : 'Save place'}
          </button>

          {/* Cancel */}
          {!saved && (
            <button
              onClick={() => go('home')}
              style={{
                width: '100%', marginTop: 10, padding: '14px 0',
                border: '1.5px solid var(--cs-slate-200)', borderRadius: 14,
                background: '#fff', fontFamily: 'var(--cs-font)',
                fontSize: 15, color: 'var(--cs-slate-600)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  )
}
