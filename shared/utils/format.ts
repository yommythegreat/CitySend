/** Shared formatting utilities — no UI dependencies. */

/** Format a number as "$XX.XX" */
export function fmt(n: number): string { return `$${n.toFixed(2)}` }

/** Format a date string as "Apr 29, 2026 · 2:14 PM" */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

/** Format a date string as "Apr 29, 2026" */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a date string as "2:14 PM" */
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

/** Format a phone string as user types — keeps digits safe */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`
}

/** Relative time label: "2 min ago", "3 hr ago", "Yesterday", date string */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)   return `${diffHr} hr ago`
  if (diffHr < 48)   return 'Yesterday'
  return fmtDate(iso)
}

/** Parcel size label */
export function parcelSizeLabel(size: 's' | 'm' | 'l'): string {
  return size === 's' ? 'Small' : size === 'l' ? 'Large' : 'Medium'
}
