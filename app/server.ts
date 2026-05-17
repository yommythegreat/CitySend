/**
 * CitySend local dev API server
 *
 * Used ONLY during local development (npm run dev:api).
 * In production, /api/create-payment-intent is served by the
 * Vercel serverless function at app/api/create-payment-intent.ts.
 *
 * Run:  tsx server.ts
 * Env:  STRIPE_SECRET_KEY, PORT
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'

const app  = express()
const PORT = Number(process.env.PORT) || 3001

// Allow the Vite dev server (any localhost port) to call this
app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }))
app.use(express.json())

// ── Stripe ──────────────────────────────────────────────────────────────────
const key    = process.env.STRIPE_SECRET_KEY ?? ''
const stripe = (key.startsWith('sk_test_') || key.startsWith('sk_live_'))
  ? new Stripe(key, { apiVersion: '2024-06-20' as any })
  : null

if (stripe) {
  const mode = key.startsWith('sk_live_') ? 'LIVE 💳' : 'test'
  console.log(`[stripe] connected — ${mode} mode`)
} else {
  console.log('[stripe] no key — /api/create-payment-intent returns mock')
}

app.post('/api/create-payment-intent', async (req, res) => {
  const { amountCad } = req.body ?? {}
  const amount = parseFloat(String(amountCad ?? ''))
  if (!amountCad || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  if (!stripe) {
    return res.json({ clientSecret: null, mock: true })
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: intent.client_secret })
  } catch (err: any) {
    console.error('[stripe error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', (_, res) => res.json({ ok: true, stripe: !!stripe }))

app.listen(PORT, () => console.log(`CitySend dev API → http://localhost:${PORT}`))
