import React, { useState, useEffect, useRef } from 'react'
import { useGeocoder, type GeoSuggestion } from '../hooks/useGeocoder'
import type { CityConfig } from '@shared/config/cityConfig'

interface Props {
  value:      string
  onChange:   (address: string, coords?: { lat: number; lng: number }) => void
  placeholder?: string
  cityConfig?:  CityConfig
}

/**
 * AdminAddressField — Address input with Nominatim autocomplete, styled to
 * match the admin's existing form inputs. Selecting a suggestion fires
 * onChange with both the address string AND the resolved lat/lng so the
 * caller can persist coords on the order (used by the driver's proximity
 * check at pickup/drop-off).
 */
export function AdminAddressField({ value, onChange, placeholder, cityConfig }: Props) {
  const { suggestions, loading, search, clear } = useGeocoder(cityConfig)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the suggestions panel when clicking outside the field.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleInput = (v: string) => {
    onChange(v)        // address only (no coords until user picks a suggestion)
    search(v)
  }

  const handleSelect = (s: GeoSuggestion) => {
    onChange(s.shortName, { lat: s.lat, lng: s.lng })
    clear()
    setFocused(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder ?? '123 Main St, Winnipeg'}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setFocused(true)}
        style={{
          width: '100%', padding: '9px 12px',
          border: '1.5px solid var(--a-border)',
          borderRadius: 8, fontSize: 13,
          fontFamily: 'var(--a-font)', outline: 'none',
          background: '#fff', color: 'var(--a-ink)',
          boxSizing: 'border-box',
        }}
      />
      {focused && (loading || suggestions.length > 0) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#fff', border: '1px solid var(--a-border)', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50,
          maxHeight: 240, overflowY: 'auto',
        }}>
          {loading && suggestions.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--a-muted)' }}>
              Searching…
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.displayName}-${i}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px', border: 'none', borderTop: i > 0 ? '1px solid var(--a-border)' : 'none',
                background: '#fff', cursor: 'pointer', fontSize: 13, color: 'var(--a-ink)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--a-bg, #f8fafc)')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ fontWeight: 500 }}>{s.shortName}</div>
              <div style={{ fontSize: 11, color: 'var(--a-muted)', marginTop: 2 }}>
                {s.displayName}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
