import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Stripe ────────────────────────────────────────────────────────────────────

let stripe: Stripe | null = null

function getStripe(): Stripe | null {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (key && (key.startsWith('sk_test_') || key.startsWith('sk_live_'))) {
    stripe = new Stripe(key, { apiVersion: '2024-06-20' as any })
  }
  return stripe
}

// ── Server-side price computation ─────────────────────────────────────────────
// Replicates computeOrderPrice() from the shared client utils so the server
// is the authoritative source of the charge amount. The client-passed total
// is only used as a fallback when Supabase is unavailable (dev/mock mode).

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

interface PriceInputs {
  cityId:      string
  distanceKm:  number
  parcelSize:  's' | 'm' | 'l'
  fragile:     boolean
  tip:         number
}

async function computeServerTotal(inputs: PriceInputs): Promise<number | null> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null

  try {
    const sb = createClient(url, key)
    const { data, error } = await sb
      .from('city_configs')
      .select('config')
      .eq('city_id', inputs.cityId)
      .maybeSingle()

    if (error || !data?.config) return null

    const cfg = data.config as any
    const p   = cfg.pricing
    const t   = cfg.taxRates

    const distanceFee = inputs.distanceKm > p.baseDistanceKm
      ? round2((inputs.distanceKm - p.baseDistanceKm) * p.extraKmFee)
      : 0
    const sizeFee   = inputs.parcelSize === 's' ? p.smallPackageFee
                    : inputs.parcelSize === 'l' ? p.largePackageFee
                    : p.mediumPackageFee
    const fragileFee   = inputs.fragile ? p.fragileFee : 0
    const subtotal     = round2(p.baseFee + distanceFee + sizeFee + fragileFee)
    const totalTax     = round2(subtotal * ((t.gst ?? 0) + (t.pst ?? 0) + (t.hst ?? 0) + (t.qst ?? 0)))
    const subtotalTaxed = round2(subtotal + totalTax)
    return round2(subtotalTaxed + round2(inputs.tip))
  } catch {
    return null
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = (req.body ?? {}) as {
    cityId?:     unknown
    distanceKm?: unknown
    parcelSize?: unknown
    fragile?:    unknown
    tip?:        unknown
    amountCad?:  unknown   // legacy fallback — ignored when inputs are present
  }

  const client = getStripe()
  if (!client) {
    return res.status(200).json({ clientSecret: null, mock: true })
  }

  // ── Validate pricing inputs ────────────────────────────────────────────────
  const cityId     = typeof body.cityId     === 'string'  ? body.cityId : null
  const distanceKm = typeof body.distanceKm === 'number'  ? body.distanceKm : parseFloat(String(body.distanceKm ?? ''))
  const parcelSize = ['s','m','l'].includes(String(body.parcelSize)) ? String(body.parcelSize) as 's'|'m'|'l' : null
  const fragile    = body.fragile === true || body.fragile === 'true'
  const tip        = Math.max(0, parseFloat(String(body.tip ?? '0')) || 0)

  let authoritative: number | null = null

  if (cityId && parcelSize && !isNaN(distanceKm) && distanceKm >= 0) {
    // Server recomputes the total — client-provided amountCad is ignored
    authoritative = await computeServerTotal({ cityId, distanceKm, parcelSize, fragile, tip })
  }

  if (authoritative === null) {
    // Pricing inputs missing or Supabase unavailable — fall back to client amount
    // Log a warning so we can monitor unexpected fallbacks in production
    const fallback = parseFloat(String(body.amountCad ?? ''))
    if (isNaN(fallback) || fallback <= 0) {
      return res.status(400).json({ error: 'Invalid pricing inputs' })
    }
    console.warn('[stripe] falling back to client-provided amount — verify Supabase config', {
      cityId, distanceKm, parcelSize,
    })
    authoritative = fallback
  }

  // Minimum charge: $1.00 CAD (Stripe minimum)
  if (authoritative < 1) {
    return res.status(400).json({ error: 'Order total below minimum charge' })
  }

  try {
    const intent = await client.paymentIntents.create({
      amount:   Math.round(authoritative * 100),  // cents
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        cityId:     cityId    ?? '',
        distanceKm: String(distanceKm ?? ''),
        parcelSize: parcelSize ?? '',
        fragile:    String(fragile),
        tip:        String(tip),
      },
    })
    return res.status(200).json({
      clientSecret:    intent.client_secret,
      authorizedTotal: authoritative,   // client displays this for confirmation
    })
  } catch (err: any) {
    console.error('[stripe]', err.message)
    return res.status(500).json({ error: 'Payment initialisation failed' })
  }
}
