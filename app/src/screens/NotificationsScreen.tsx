import React, { useState, useEffect, useMemo } from 'react'
import { Tag } from '../components/Tag'
import { IconButton } from '../components/IconButton'
import { Back, Check, Truck, User, Receipt, Sparkle } from '../components/Icons'
import { GuestPrompt } from '../components/GuestPrompt'
import {
  fetchCustomerNotifs, markNotifRead, markAllNotifsRead,
  type CustomerNotif, type NotifEvent,
} from '../utils/notificationStore'
import type { ScreenName, NavOptions, AuthUser } from '../types'

interface Props {
  go:           (screen: ScreenName, opts?: NavOptions) => void
  user:         AuthUser | null
  notifVersion: number
}

type ToneKey = 'ok' | 'ink' | 'neutral' | 'accent'

function eventTone(event: NotifEvent): ToneKey {
  if (event === 'delivered')        return 'ok'
  if (event === 'driver_assigned' || event === 'driver_en_route' || event === 'in_transit' || event === 'picked_up') return 'ink'
  if (event === 'receipt_generated') return 'neutral'
  if (event === 'cancelled')         return 'neutral'
  return 'accent'
}

function eventLabel(event: NotifEvent): string {
  const map: Record<NotifEvent, string> = {
    order_created:    'New order',
    driver_assigned:  'Matched',
    driver_en_route:  'En route',
    picked_up:        'Picked up',
    in_transit:       'In transit',
    delivered:        'Delivered',
    cancelled:        'Cancelled',
    issue_reported:   'Issue',
    receipt_generated:'Receipt',
  }
  return map[event] ?? 'Update'
}

function eventIcon(event: NotifEvent) {
  if (event === 'delivered')                    return <Check   size={11} />
  if (event === 'in_transit' || event === 'picked_up') return <Truck size={12} />
  if (event === 'driver_assigned' || event === 'driver_en_route') return <User size={11} />
  if (event === 'receipt_generated')            return <Receipt size={11} />
  return <Sparkle size={11} />
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins  = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays  = Math.floor(diffMs / 86_400_000)
  if (diffMins  < 1)   return 'Just now'
  if (diffMins  < 60)  return `${diffMins}m ago`
  if (diffHours < 24)  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  if (diffDays  < 7)   return d.toLocaleDateString('en-CA', { weekday: 'short' })
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// Group notifications by relative day
function groupByDay(notifs: CustomerNotif[]): { day: string; items: CustomerNotif[] }[] {
  const groups: { day: string; items: CustomerNotif[] }[] = []
  const now = new Date()
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeek      = startOfToday - 6 * 86_400_000

  for (const n of notifs) {
    const t = new Date(n.createdAt).getTime()
    const day =
      t >= startOfToday     ? 'Today' :
      t >= startOfYesterday ? 'Yesterday' :
      t >= startOfWeek      ? 'This week' :
                              new Date(n.createdAt).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

    const existing = groups.find(g => g.day === day)
    if (existing) { existing.items.push(n) }
    else          { groups.push({ day, items: [n] }) }
  }
  return groups
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function NotificationsScreen({ go, user, notifVersion }: Props) {
  const [liveNotifs, setLiveNotifs] = useState<CustomerNotif[]>([])
  const [tick,       setTick]       = useState(0)

  // Guests have no notifications history — show gate immediately before effects run
  if (user?.id === 'guest') {
    return (
      <div className="cs-screen cs-enter-up" style={{ position: 'relative' }}>
        <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <IconButton onClick={() => go('home')}><Back /></IconButton>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Notifications</div>
        </div>
        <GuestPrompt
          go={go}
          title="Stay in the loop."
          message="Create a free CitySend account to get delivery updates, driver notifications, and receipts straight to your inbox."
          onDismiss={() => go('home')}
        />
      </div>
    )
  }

  // Load live notifications from the store (async: Supabase or localStorage)
  useEffect(() => {
    let cancelled = false
    fetchCustomerNotifs(user?.id).then(notifs => {
      if (!cancelled) setLiveNotifs(notifs)
    })
    return () => { cancelled = true }
  }, [user?.id, notifVersion, tick])

  const allNotifs = useMemo(() =>
    [...liveNotifs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [liveNotifs])

  const groups     = useMemo(() => groupByDay(allNotifs), [allNotifs])
  const unreadCount = allNotifs.filter(n => !n.read).length

  const handleMarkRead = (notif: CustomerNotif) => {
    markNotifRead(notif.id).then(() => setTick(t => t + 1))
    // Navigate to tracking if the notification is order-related and has an orderId
    const trackableEvents: NotifEvent[] = [
      'driver_assigned', 'driver_en_route', 'picked_up', 'in_transit', 'delivered',
    ]
    if (notif.orderId && trackableEvents.includes(notif.event)) {
      go('tracking', { trackOrderId: notif.orderId })
    }
  }

  const handleMarkAllRead = () => {
    markAllNotifsRead(user?.id).then(() => setTick(t => t + 1))
  }

  return (
    <div className="cs-screen cs-enter-up">
      {/* Top bar */}
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <IconButton onClick={() => go('home')}><Back /></IconButton>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Notifications</div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          title="Mark all as read"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 18,
            background: unreadCount > 0 ? 'var(--cs-ink)' : 'var(--cs-slate-100)',
            border: 'none', cursor: unreadCount > 0 ? 'pointer' : 'default',
            position: 'relative', flexShrink: 0,
            transition: 'background .18s',
          }}
        >
          <Check size={15} color={unreadCount > 0 ? '#fff' : 'var(--cs-slate-400)'} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 16, height: 16, borderRadius: 8,
              background: 'var(--cs-accent)', border: '1.5px solid var(--cs-paper)',
              fontSize: 10, fontFamily: 'var(--cs-mono)', fontWeight: 700,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, padding: '0 3px',
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '24px 20px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, color: 'var(--cs-ink)' }}>
          What's happening
        </div>
        {unreadCount > 0 && (
          <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 4 }}>
            {unreadCount} unread
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 100 }}>
        {groups.map((g) => (
          <div key={g.day} style={{ padding: '0 20px 16px' }}>
            <div style={{
              fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
              letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
            }}>
              {g.day}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  style={{
                    background: n.read ? '#F8F9FB' : '#fff',
                    borderRadius: 14,
                    border: `1px solid ${n.read ? 'transparent' : 'var(--cs-slate-100)'}`,
                    padding: 14,
                    display: 'flex', gap: 12,
                    width: '100%', textAlign: 'left',
                    cursor: n.read ? 'default' : 'pointer',
                    fontFamily: 'var(--cs-font)',
                    transition: 'background .18s, border-color .18s',
                    opacity: n.read ? 0.65 : 1,
                    position: 'relative',
                  }}
                >
                  {!n.read && (
                    <span style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--cs-accent)', flexShrink: 0,
                    }} />
                  )}

                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <Tag tone={eventTone(n.event)} icon={eventIcon(n.event)}>
                      {eventLabel(n.event)}
                    </Tag>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 3, lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                    flexShrink: 0, paddingTop: 2,
                    paddingRight: n.read ? 0 : 16,
                  }}>
                    {fmtTime(n.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cs-ink)' }}>All caught up</div>
            <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 6 }}>
              Delivery updates will appear here.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
