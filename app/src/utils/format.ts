/** Format a phone string as user types — keeps digits, spaces, parentheses safe */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`
}

/** Sanitize plain text — strip dangerous chars (extra safety on top of React's JSX escaping) */
export function sanitizeText(v: string): string {
  return v.replace(/[<>]/g, '')
}
