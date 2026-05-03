/**
 * Strip a raw phone string down to its digits.
 * Handles: +1 prefix, country code 1, parens, dashes, spaces.
 */
function digitsOnly(raw: string): string {
  const cleaned = raw.replace(/\D/g, '')
  // Strip leading country code "1" only if ≥11 digits
  if (cleaned.length === 11 && cleaned.startsWith('1')) return cleaned.slice(1)
  return cleaned
}

/** Format a phone string as user types — keeps digits, spaces, parentheses safe */
export function formatPhone(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`
}

/**
 * Returns true for a valid 10-digit North American phone number.
 * Accepts: 2041234567, 204-123-4567, (204) 123-4567, +1 204 123 4567, etc.
 * Rejects: too short/long, letters, invalid area codes (0xx / 1xx).
 */
export function isValidPhone(raw: string): boolean {
  if (!raw || !raw.trim()) return false
  const digits = digitsOnly(raw)
  if (digits.length !== 10) return false
  // Area code cannot start with 0 or 1
  if (digits[0] === '0' || digits[0] === '1') return false
  // Exchange code cannot start with 0 or 1
  if (digits[3] === '0' || digits[3] === '1') return false
  return true
}

/**
 * Normalise to E.164-style (+1XXXXXXXXXX).
 * Returns null if the phone is not valid.
 */
export function normalizePhone(raw: string): string | null {
  if (!isValidPhone(raw)) return null
  return `+1${digitsOnly(raw)}`
}

/** Sanitize plain text — strip dangerous chars (extra safety on top of React's JSX escaping) */
export function sanitizeText(v: string): string {
  return v.replace(/[<>]/g, '')
}
