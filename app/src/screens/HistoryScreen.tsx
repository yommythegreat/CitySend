import React, { useState, useRef, useEffect } from 'react'
import { Segment } from '../components/Segment'
import { Tag } from '../components/Tag'
import { IconButton } from '../components/IconButton'
import { Back, Check, Truck, Repeat, Search, X } from '../components/Icons'
import { GuestGatedScreen } from '../components/GuestGatedScreen'
import type { AppState, AuthUser, ScreenName, NavOptions, Delivery } from '../types'

interface Props {
  go: (screen: ScreenName, opts?: NavOptions) => void
  state: AppState
  user: AuthUser | null
}

function statusTone(s: Delivery['status']): 'ok' | 'ink' | 'neutral' {
  if (s === 'delivered')  return 'ok'
  if (s === 'in-transit') return 'ink'
  return 'neutral'
}
function statusLabel(s: Delivery['status']) {
  if (s === 'delivered')  return 'Delivered'
  if (s === 'in-transit') return 'In transit'
  return 'Canceled'
}
function statusIcon(s: Delivery['status']) {
  if (s === 'delivered')  return <Check size={11} />
  if (s === 'in-transit') return <Truck size={12} />
  return null
}

function matchesSearch(d: Delivery, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase()
  return (
    d.to.name.toLowerCase().includes(lower) ||
    d.to.address.toLowerCase().includes(lower) ||
    (d.from?.address?.toLowerCase().includes(lower) ?? false) ||
    statusLabel(d.status).toLowerCase().includes(lower) ||
    `cs-${d.id}`.toLowerCase().includes(lower) ||
    d.id.includes(lower)
  )
}

export function HistoryScreen({ go, state, user }: Props) {
  // Guests have no delivery history — show a signup prompt instead
  if (user?.id === 'guest') return (
    <GuestGatedScreen
      go={go} screenTitle="History" backTarget="home" enterClass="cs-enter-up"
      promptTitle="Keep your delivery history in one place."
      promptMessage="Create a free CitySend account to view receipts, track past deliveries, and reorder with one tap."
    />
  )
  const [tab,        setTab]        = useState('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query,      setQuery]      = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const closeSearch = () => { setSearchOpen(false); setQuery('') }

  const tabFiltered = state.pastDeliveries.filter((d) => {
    if (tab === 'active') return d.status === 'in-transit'
    if (tab === 'done')   return d.status === 'delivered'
    return true
  })

  // When a search query is active, search across ALL deliveries (not just the current tab)
  const filtered = (query ? state.pastDeliveries : tabFiltered).filter(d => matchesSearch(d, query))

  return (
    <div className="cs-screen cs-enter-up">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>History</div>
        {searchOpen
          ? <IconButton onClick={closeSearch}><X size={18} /></IconButton>
          : <IconButton onClick={() => setSearchOpen(true)}><Search size={18} /></IconButton>
        }
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid var(--cs-slate-200)', borderRadius: 12, padding: '10px 14px' }}>
            <Search size={16} color="var(--cs-slate-400)" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Name, address, status, ID…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'var(--cs-font)', background: 'transparent', color: 'var(--cs-ink)' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <X size={14} color="var(--cs-slate-400)" />
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '20px 20px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, color: 'var(--cs-ink)' }}>
          {searchOpen && query ? `Results for "${query}"` : 'All deliveries'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 4 }}>
          {searchOpen && query
            ? `${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}`
            : `${state.pastDeliveries.length} total`
          }
        </div>
      </div>

      {/* Tabs — hide when searching */}
      {!query && (
        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <Segment
            options={[
              { value: 'all',    label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'done',   label: 'Delivered' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}

      <div style={{ flex: 1, padding: '0 20px 100px', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} color="var(--cs-slate-400)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cs-ink)' }}>
              {query ? 'No matches found' : 'Nothing on the move yet.'}
            </div>
            {query && (
              <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', textAlign: 'center', maxWidth: 240 }}>
                Try a different name, address, or delivery ID.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((d) => (
              <div key={d.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Tag tone={statusTone(d.status)} icon={statusIcon(d.status)}>
                    {statusLabel(d.status)}
                  </Tag>
                  <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)' }}>CS—{d.id}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>{d.to.name}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{d.to.address}</div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--cs-slate-100)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>
                    {d.date}
                  </div>
                  {d.status !== 'in-transit' && (
                    <button
                      onClick={() => go('new-1', { prefill: d })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--cs-slate-100)', border: 'none', padding: '6px 12px', borderRadius: 999, color: 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500 }}
                    >
                      <Repeat size={13} /> Send again
                    </button>
                  )}
                  {d.status === 'in-transit' && (
                    <button
                      onClick={() => go('tracking', { trackOrderId: `CS-${d.id}` })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--cs-ink)', border: 'none', padding: '6px 12px', borderRadius: 999, color: '#fff', fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500 }}
                    >
                      Track live
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
