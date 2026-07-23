import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Per-instance sliding-window rate limiter. Vercel reuses warm instances, so
// this catches the vast majority of abuse without requiring external Redis.
// Limits: 10 requests / 60 s per IP.

const RATE_LIMIT      = 10
const RATE_WINDOW_MS  = 60_000

interface RateBucket { count: number; windowStart: number }
const rateBuckets = new Map<string, RateBucket>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now    = Date.now()
  const bucket = rateBuckets.get(ip)

  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetMs: RATE_WINDOW_MS }
  }

  bucket.count++
  const resetMs = RATE_WINDOW_MS - (now - bucket.windowStart)

  if (bucket.count > RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetMs }
  }
  return { allowed: true, remaining: RATE_LIMIT - bucket.count, resetMs }
}

// Prune stale buckets every ~5 minutes to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS
  for (const [ip, b] of rateBuckets) {
    if (b.windowStart < cutoff) rateBuckets.delete(ip)
  }
}, 5 * 60_000)

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

// Fallback Express flat pre-tax fee, used only when the city's config row
// predates the pricing.expressFlatFee field. The DB value (admin-managed via
// Configuration → Pricing) is authoritative; keep this equal to the legacy
// EXPRESS_FLAT_FEE in app/src/config/cityConfig.ts.
const EXPRESS_FLAT_FEE = 25

interface PriceInputs {
  cityId:         string
  distanceKm:     number
  parcelSize:     's' | 'm' | 'l'
  fragile:        boolean
  tip:            number
  deliveryWindow: 'morning' | 'evening' | 'express'
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

    const isExpress = inputs.deliveryWindow === 'express'

    // Express: flat pre-tax fee replaces base/distance/size/fragile entirely.
    // Admin-managed per city; fall back for config rows missing the field.
    const baseFee = isExpress ? (p.expressFlatFee ?? EXPRESS_FLAT_FEE) : p.baseFee
    const distanceFee = !isExpress && inputs.distanceKm > p.baseDistanceKm
      ? round2((inputs.distanceKm - p.baseDistanceKm) * p.extraKmFee)
      : 0
    const sizeFee   = isExpress ? 0
                    : inputs.parcelSize === 's' ? p.smallPackageFee
                    : inputs.parcelSize === 'l' ? p.largePackageFee
                    : p.mediumPackageFee
    const fragileFee   = (!isExpress && inputs.fragile) ? p.fragileFee : 0
    const subtotal     = round2(baseFee + distanceFee + sizeFee + fragileFee)
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

  // ── Rate limit check ────────────────────────────────────────────────────────
  const ip = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req as any).socket?.remoteAddress ||
    'unknown'
  )
  const { allowed, remaining, resetMs } = checkRateLimit(ip)
  res.setHeader('X-RateLimit-Limit',     String(RATE_LIMIT))
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.setHeader('X-RateLimit-Reset',     String(Math.ceil(resetMs / 1000)))

  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait before trying again.' })
  }

  const body = (req.body ?? {}) as {
    cityId?:         unknown
    distanceKm?:     unknown
    parcelSize?:     unknown
    fragile?:        unknown
    tip?:            unknown
    deliveryWindow?: unknown
    amountCad?:      unknown   // legacy fallback — ignored when inputs are present
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
  // Unknown/absent window values fall back to 'morning' (standard pricing) —
  // never let a malformed value select the flat express price.
  const deliveryWindow = ['morning','evening','express'].includes(String(body.deliveryWindow))
    ? String(body.deliveryWindow) as 'morning'|'evening'|'express'
    : 'morning'

  let authoritative: number | null = null

  if (cityId && parcelSize && !isNaN(distanceKm) && distanceKm >= 0) {
    // Server recomputes the total — client-provided amountCad is ignored
    authoritative = await computeServerTotal({ cityId, distanceKm, parcelSize, fragile, tip, deliveryWindow })
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
        cityId:         cityId    ?? '',
        distanceKm:     String(distanceKm ?? ''),
        parcelSize:     parcelSize ?? '',
        fragile:        String(fragile),
        tip:            String(tip),
        deliveryWindow,
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
