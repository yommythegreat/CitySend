import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

let stripe: Stripe | null = null

function getStripe(): Stripe | null {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (key && (key.startsWith('sk_test_') || key.startsWith('sk_live_'))) {
    stripe = new Stripe(key, { apiVersion: '2024-06-20' as any })
  }
  return stripe
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amountCad } = (req.body ?? {}) as { amountCad?: unknown }
  const amount = parseFloat(String(amountCad ?? ''))
  if (!amountCad || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const client = getStripe()
  if (!client) {
    // No key configured — return mock signal (only useful in DEV)
    return res.status(200).json({ clientSecret: null, mock: true })
  }

  try {
    const intent = await client.paymentIntents.create({
      amount:   Math.round(amount * 100),   // cents
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
    })
    return res.status(200).json({ clientSecret: intent.client_secret })
  } catch (err: any) {
    console.error('[stripe]', err.message)
    return res.status(500).json({ error: 'Payment initialisation failed' })
  }
}
