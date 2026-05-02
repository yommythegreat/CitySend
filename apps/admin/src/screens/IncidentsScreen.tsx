import React, { useState, useMemo } from 'react'
import { Modal } from '../components/Modal'
import { useAdminStore } from '../store/AdminContext'
import type { IncidentStatus, IncidentSeverity, IncidentSource } from '@shared/types'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
} from '@shared/types'

// ── Status / severity pill styles ─────────────────────────────────────────────

const STATUS_COLORS: Record<IncidentStatus, { bg: string; color: string }> = {
  new:       { bg: '#fef3c7', color: '#92400e' },
  in_review: { bg: '#dbeafe', color: '#1e40af' },
  resolved:  { bg: '#dcfce7', color: '#166534' },
  escalated: { bg: '#fee2e2', color: '#991b1b' },
  closed:    { bg: 'var(--a-bg)', color: 'var(--a-muted)' },
}

const SEV_COLORS: Record<IncidentSeverity, { bg: string; color: string }> = {
  low:      { bg: '#f1f5f9', color: '#475569' },
  medium:   { bg: '#fef3c7', color: '#92400e' },
  high:     { bg: '#fee2e2', color: '#991b1b' },
  critical: { bg: '#7f1d1d', color: '#fecaca' },
}

function StatusPill({ status }: { status: IncidentStatus }) {
  const c = STATUS_COLORS[status]
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>{INCIDENT_STATUS_LABELS[status]}</span>
  )
}

function SeverityPill({ severity }: { severity: IncidentSeverity }) {
  const c = SEV_COLORS[severity]
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>{INCIDENT_SEVERITY_LABELS[severity]}</span>
  )
}

// ── Incident detail modal ─────────────────────────────────────────────────────

function IncidentDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useAdminStore()
  const incident = state.incidents.find(i => i.id === id)
  const [note,   setNote]   = useState('')
  const [status, setStatus] = useState<IncidentStatus | ''>('')

  if (!incident) return null

  const linkedOrder = state.orders.find(o => o.id === incident.orderId)

  const handleAddNote = () => {
    if (!note.trim()) return
    const newNote = {
      id:         `inote-${Date.now()}`,
      text:       note.trim(),
      authorName: 'Admin',
      createdAt:  new Date().toISOString(),
    }
    dispatch({
      type: 'UPDATE_INCIDENT',
      id: incident.id,
      patch: { notes: [...incident.notes, newNote] },
    })
    setNote('')
  }

  const handleStatusChange = (newStatus: IncidentStatus) => {
    dispatch({ type: 'UPDATE_INCIDENT', id: incident.id, patch: { status: newStatus } })
    setStatus('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid var(--a-border)',
    borderRadius: 8, fontSize: 13, fontFamily: 'var(--a-font)', outline: 'none',
    background: '#fff', color: 'var(--a-ink)', boxSizing: 'border-box',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', gap: 8, marginBottom: 10, fontSize: 13,
  }

  const nextStatuses: IncidentStatus[] = incident.status === 'new'
    ? ['in_review', 'escalated', 'resolved', 'closed']
    : incident.status === 'in_review'
    ? ['resolved', 'escalated', 'closed']
    : incident.status === 'escalated'
    ? ['in_review', 'resolved', 'closed']
    : []

  return (
    <div>
      {/* Header info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Incident ID</div>
          <div style={{ fontFamily: 'var(--a-mono)', fontSize: 13, fontWeight: 600 }}>{incident.id}</div>
        </div>
        <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Order</div>
          <div style={{ fontFamily: 'var(--a-mono)', fontSize: 13, fontWeight: 600 }}>{incident.orderId}</div>
        </div>
        <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Reporter</div>
          <div style={{ fontSize: 13 }}>{incident.reporterName} <span style={{ color: 'var(--a-muted)' }}>({incident.source})</span></div>
        </div>
        <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--a-muted)', marginBottom: 3 }}>Category</div>
          <div style={{ fontSize: 13 }}>{incident.category}</div>
        </div>
      </div>

      <div style={rowStyle}>
        <StatusPill status={incident.status} />
        <SeverityPill severity={incident.severity} />
      </div>

      <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--a-muted)', marginBottom: 4 }}>Description</div>
        <div style={{ fontSize: 14, color: 'var(--a-ink)', lineHeight: 1.5 }}>{incident.description}</div>
      </div>

      {linkedOrder && (
        <div style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--a-muted)' }}>
          📦 {linkedOrder.pickup.address.split(',')[0]} → {linkedOrder.dropoff.address.split(',')[0]}
          {' · '}{linkedOrder.customerName}
        </div>
      )}

      {/* Status update */}
      {nextStatuses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 8 }}>Update status</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: '6px 14px', border: '1.5px solid var(--a-border)',
                  borderRadius: 999, background: '#fff', color: 'var(--a-ink)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >{INCIDENT_STATUS_LABELS[s]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Notes thread */}
      {incident.notes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 8 }}>Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incident.notes.map(n => (
              <div key={n.id} style={{ background: 'var(--a-bg)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--a-ink)' }}>{n.authorName}</span>
                  <span style={{ color: 'var(--a-muted)', fontSize: 11 }}>{new Date(n.createdAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ color: 'var(--a-ink)', lineHeight: 1.4 }}>{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add note */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 6 }}>Add note</div>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Internal note for this incident…"
        />
        <button
          onClick={handleAddNote}
          disabled={!note.trim()}
          style={{
            marginTop: 8, padding: '8px 18px', border: 'none', borderRadius: 8,
            background: !note.trim() ? 'var(--a-border)' : 'var(--a-sidebar)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: !note.trim() ? 'default' : 'pointer',
          }}
        >Add note</button>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const STATUS_FILTERS: (IncidentStatus | 'all' | 'open')[] = ['all', 'open', 'new', 'in_review', 'escalated', 'resolved', 'closed']
const SOURCE_LABELS: Record<IncidentSource, string> = {
  customer: 'Customer',
  driver:   'Driver',
  admin:    'Admin',
}

export function IncidentsScreen() {
  const { state } = useAdminStore()
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all' | 'open'>('open')
  const [search,       setSearch]       = useState('')
  const [openId,       setOpenId]       = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = state.incidents
    if (statusFilter === 'open') {
      list = list.filter(i => i.status === 'new' || i.status === 'in_review' || i.status === 'escalated')
    } else if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.orderId.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.reporterName.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [state.incidents, statusFilter, search])

  const counts = useMemo(() => ({
    all:       state.incidents.length,
    open:      state.incidents.filter(i => ['new','in_review','escalated'].includes(i.status)).length,
    new:       state.incidents.filter(i => i.status === 'new').length,
    in_review: state.incidents.filter(i => i.status === 'in_review').length,
    escalated: state.incidents.filter(i => i.status === 'escalated').length,
    resolved:  state.incidents.filter(i => i.status === 'resolved').length,
    closed:    state.incidents.filter(i => i.status === 'closed').length,
  }), [state.incidents])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--a-ink)' }}>Incidents</div>
          <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 2 }}>
            {counts.open} open · {state.incidents.length} total
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-muted)', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents…"
            style={{
              padding: '8px 12px 8px 32px', border: '1.5px solid var(--a-border)',
              borderRadius: 8, fontSize: 13, outline: 'none',
              background: '#fff', width: 240,
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 999,
              border: statusFilter === f ? 'none' : '1.5px solid var(--a-border)',
              background: statusFilter === f ? 'var(--a-sidebar)' : '#fff',
              color: statusFilter === f ? '#fff' : 'var(--a-ink2)',
              fontSize: 12, fontWeight: statusFilter === f ? 600 : 400, cursor: 'pointer',
            }}
          >
            {f === 'open' ? 'Open' : f === 'all' ? 'All' : INCIDENT_STATUS_LABELS[f as IncidentStatus]}
            <span style={{ marginLeft: 5, fontSize: 10, color: statusFilter === f ? 'rgba(255,255,255,0.6)' : 'var(--a-muted)' }}>
              {counts[f as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {state.incidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--a-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--a-ink)' }}>No incidents reported</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Incidents filed by customers or drivers will appear here.</div>
        </div>
      ) : (
        <table className="a-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Order</th>
              <th>Source</th>
              <th>Reporter</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--a-muted)' }}>
                  No incidents match your filter.
                </td>
              </tr>
            ) : filtered.map(i => (
              <tr
                key={i.id}
                className="clickable"
                onClick={() => setOpenId(i.id)}
                style={{ opacity: i.status === 'closed' ? 0.6 : 1 }}
              >
                <td><span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, fontWeight: 600 }}>{i.id}</span></td>
                <td><span style={{ fontFamily: 'var(--a-mono)', fontSize: 11 }}>{i.orderId}</span></td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)' }}>{SOURCE_LABELS[i.source]}</td>
                <td style={{ fontSize: 13 }}>{i.reporterName}</td>
                <td style={{ fontSize: 13, maxWidth: 160 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.category}</div>
                </td>
                <td><SeverityPill severity={i.severity} /></td>
                <td><StatusPill status={i.status} /></td>
                <td style={{ fontSize: 12, color: 'var(--a-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(i.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--a-accent)', fontSize: 14 }}>›</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openId && (
        <Modal title={`Incident ${openId}`} onClose={() => setOpenId(null)} width={600}>
          <IncidentDetailModal id={openId} onClose={() => setOpenId(null)} />
        </Modal>
      )}
    </div>
  )
}
