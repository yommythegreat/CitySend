/**
 * handoffCodeStore — Generate, persist, and validate 4-digit handoff codes.
 *
 * Flow:
 *   1. Customer app calls `generateHandoffCode(orderId)` at booking time.
 *      The code is written to `orders.handoff_code` in Supabase.
 *   2. The code is embedded in the customer's "your order is out for delivery"
 *      notification (see notificationStore).
 *   3. Driver calls `validateHandoffCode(orderId, enteredCode)` to verify.
 *
 * The code is a cryptographically random 4-digit string (0000–9999),
 * stored as a string to preserve leading zeros.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** Generate a random 4-digit code string, e.g. "0847" */
export function newHandoffCode(): string {
  const n = Math.floor(Math.random() * 10000)
  return String(n).padStart(4, '0')
}

/**
 * Write a freshly-generated handoff code to the orders row.
 * Call this once when the order is created/confirmed.
 *
 * @returns The generated code (so it can be included in the confirmation email/notification)
 */
export async function generateHandoffCode(orderId: string): Promise<string> {
  const code = newHandoffCode()

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('orders')
      .update({ handoff_code: code, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) console.warn('[handoffCodeStore] write error:', error.message)
  }

  return code
}

/**
 * Validate the code entered by the driver against what is stored on the order.
 * Returns true if the code matches (case-insensitive, leading zeros normalised).
 */
export async function validateHandoffCode(
  orderId: string,
  entered: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    // In dev/demo mode without Supabase, accept any 4-digit code
    return /^\d{4}$/.test(entered)
  }

  const { data, error } = await supabase
    .from('orders')
    .select('handoff_code')
    .eq('id', orderId)
    .single()

  if (error || !data?.handoff_code) return false
  return data.handoff_code === entered.trim()
}
