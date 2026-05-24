import React, { useState } from 'react'
import { Modal } from './Modal'
import { DriverStatusBadge } from './StatusBadge'
import { useAdminStore } from '../store/AdminContext'
import type { Driver } from '@shared/types'

interface Props {
  orderId:  string
  onClose:  () => void
}

export function AssignDriverModal({ orderId, onClose }: Props) {
  const { state, dispatch } = useAdminStore()
  const [selectedId, setSelectedId] = useState<string>('')

  // Belt-and-suspenders: exclude drivers with any non-terminal order, even if
  // their status hasn't synced yet (catches race conditions during assignment).
  const busyDriverIds = new Set(
    state.orders
      .filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.assignedDriverId)
      .map(o => o.assignedDriverId!)
  )
  const availableDrivers = state.drivers.filter(
    d => d.status === 'available' && !busyDriverIds.has(d.id)
  )
  const order = state.orders.find(o => o.id === orderId)

  const handleAssign = () => {
    if (!selectedId) return
    dispatch({ type: 'ASSIGN_DRIVER', orderId, driverId: selectedId })
    onClose()
  }

  return (
    <Modal
      title={`Assign Driver — ${orderId}`}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1.5px solid var(--a-border)',
              borderRadius: 7, background: '#fff', color: 'var(--a-ink)',
              fontSize: 13, fontWeight: 500,
            }}
          >Cancel</button>
          <button
            onClick={handleAssign}
            disabled={!selectedId}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 7,
              background: selectedId ? 'var(--a-sidebar)' : 'var(--a-border)',
              color: selectedId ? '#fff' : 'var(--a-muted)',
              fontSize: 13, fontWeight: 600,
            }}
          >Assign driver</button>
        </>
      }
    >
      {order?.assignedDriverId && (
        <div style={{
          padding: '10px 12px', borderRadius: 7, marginBottom: 14,
          background: 'var(--a-warn-bg)', color: 'var(--a-warn)',
          fontSize: 13,
        }}>
          Currently assigned to {order.assignedDriverName}. Reassigning will update the driver.
        </div>
      )}

      {availableDrivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-muted)', fontSize: 14 }}>
          No drivers available right now.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {availableDrivers.map((d: Driver) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', border: `1.5px solid ${selectedId === d.id ? 'var(--a-sidebar)' : 'var(--a-border)'}`,
                borderRadius: 8, background: selectedId === d.id ? '#f0f1f3' : '#fff',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg,#2b3548,#5b657a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{d.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--a-ink)' }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 1 }}>
                  ★ {d.rating} · {d.completedOrders} trips · {d.vehicle.split(' — ')[0]}
                </div>
              </div>
              <DriverStatusBadge status={d.status} size="sm" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
