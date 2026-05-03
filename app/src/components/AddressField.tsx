import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { useGeocoder, GeoSuggestion } from '../hooks/useGeocoder'
import type { CityConfig } from '../config/cityConfig'
import { Pin } from './Icons'

interface AddressFieldProps {
  label?: string
  value: string
  onChange: (address: string, coords?: { lat: number; lng: number }) => void
  onBlur?: () => void
  placeholder?: string
  icon?: ReactNode
  disabled?: boolean
  /** Show red border when true */
  error?: boolean
  /** Pass the active CityConfig to bias address suggestions to this city. */
  cityConfig?: CityConfig
}

export function AddressField({ label, value, onChange, onBlur, placeholder, icon, disabled, error, cityConfig }: AddressFieldProps) {
  const [focused, setFocused]   = useState(false)
  const [open, setOpen]         = useState(false)
  const { suggestions, loading, search, clear } = useGeocoder(cityConfig)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        clear()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clear])

  const handleInput = (v: string) => {
    onChange(v)
    search(v)
    setOpen(true)
  }

  const handleSelect = (s: GeoSuggestion) => {
    onChange(s.shortName, { lat: s.lat, lng: s.lng })
    setOpen(false)
    clear()
    inputRef.current?.blur()
  }

  const showDropdown = open && (suggestions.length > 0 || loading) && focused

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <div style={{
          fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
          letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 52, padding: '0 16px',
        background: '#fff',
        border: `1.5px solid ${error && !focused ? 'var(--cs-err)' : focused ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
        borderRadius: 12, transition: 'border-color .15s',
      }}>
        <div style={{ color: 'var(--cs-slate-500)', display: 'flex', flexShrink: 0 }}>
          {icon ?? <Pin size={18} />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder ?? 'Street address'}
          onFocus={() => { setFocused(true); if (value.length >= 3) { search(value); setOpen(true) } }}
          onBlur={() => setTimeout(() => { setFocused(false); onBlur?.() }, 150)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--cs-font)', fontSize: 16, color: 'var(--cs-ink)', minWidth: 0,
          }}
        />
        {loading && (
          <div style={{
            width: 14, height: 14, border: '2px solid var(--cs-slate-200)',
            borderTopColor: 'var(--cs-slate-500)', borderRadius: 7,
            animation: 'cs-spin 0.7s linear infinite', flexShrink: 0,
          }} />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', borderRadius: 12, zIndex: 100,
          border: '1px solid var(--cs-slate-200)',
          boxShadow: '0 8px 24px -8px rgba(11,18,32,.18)',
          overflow: 'hidden',
        }}>
          {suggestions.length === 0 && loading && (
            <div style={{ padding: '12px 16px', fontSize: 14, color: 'var(--cs-slate-500)' }}>
              Searching…
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(s)}
              style={{
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                padding: '12px 16px', background: 'transparent', fontFamily: 'var(--cs-font)',
                borderTop: i > 0 ? '1px solid var(--cs-slate-100)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cs-slate-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Pin size={14} color="var(--cs-slate-400)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cs-ink)' }}>{s.shortName}</div>
                <div style={{
                  fontSize: 12, color: 'var(--cs-slate-500)', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280,
                }}>
                  {s.displayName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
