/**
 * CitySend API server
 * Handles: Stripe payment intents, user auth (in-memory, swap for DB in prod)
 *
 * Run:  tsx server.ts
 * Env:  STRIPE_SECRET_KEY, PORT, AUTH_SALT
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'crypto'

const app  = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'] }))
app.use(express.json())

// ── Stripe (optional – gracefully absent when key not set) ──────────────────
let stripe: import('stripe').default | null = null

;(async () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (key && key !== 'sk_test_placeholder' && (key.startsWith('sk_test_') || key.startsWith('sk_live_'))) {
    const { default: Stripe } = await import('stripe')
    stripe = new Stripe(key, { apiVersion: '2024-06-20' as any })
    const mode = key.startsWith('sk_live_') ? 'LIVE 💳' : 'test'
    console.log(`[stripe] connected — ${mode} mode`)
    if (key.startsWith('sk_live_') && process.env.NODE_ENV !== 'production') {
      console.warn('[stripe] ⚠️  LIVE key detected outside NODE_ENV=production — double-check this is intentional')
    }
  } else {
    console.log('[stripe] no real key — payment endpoint will return mock secret')
  }
})()

// ── Auth (in-memory; replace with DB for production) ───────────────────────
interface User {
  id: string
  email: string
  name: string
  phone?: string
  passwordHash: string
  token: string
}

const users = new Map<string, User>()

function sha256(s: string): string {
  const salt = process.env.AUTH_SALT || 'citysend-salt'
  return crypto.createHash('sha256').update(s + salt).digest('hex')
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, '')
  const user  = token ? [...users.values()].find(u => u.token === token) : null
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  ;(req as any).user = user
  next()
}

app.post('/api/auth/register', (req, res) => {
  const { email, name, password } = req.body ?? {}
  if (!email?.trim() || !name?.trim() || !password?.trim())
    return res.status(400).json({ error: 'All fields required' })

  const key = email.toLowerCase().trim()
  if (users.has(key)) return res.status(409).json({ error: 'Email already registered' })

  const user: User = {
    id:           crypto.randomUUID(),
    email:        key,
    name:         name.trim(),
    passwordHash: sha256(password),
    token:        crypto.randomUUID(),
  }
  users.set(key, user)
  res.status(201).json({ token: user.token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone } })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const user = users.get(email?.toLowerCase()?.trim())
  if (!user || user.passwordHash !== sha256(password))
    return res.status(401).json({ error: 'Invalid email or password' })

  user.token = crypto.randomUUID() // rotate on every login
  res.json({ token: user.token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone } })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { id, email, name, phone } = (req as any).user as User
  res.json({ id, email, name, phone })
})

// ── Stripe: create payment intent ──────────────────────────────────────────
app.post('/api/create-payment-intent', async (req, res) => {
  const { amountCad } = req.body ?? {}
  if (!amountCad || isNaN(parseFloat(amountCad)))
    return res.status(400).json({ error: 'Invalid amount' })

  if (!stripe) {
    // Return a mock secret so the UI can degrade gracefully
    return res.json({ clientSecret: null, mock: true, message: 'Add STRIPE_SECRET_KEY to .env to enable real payments' })
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(parseFloat(amountCad) * 100),
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: intent.client_secret })
  } catch (err: any) {
    console.error('[stripe error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Seed demo account ──────────────────────────────────────────────────────
;(function seedDemo() {
  const key = 'demo@citysend.ca'
  if (!users.has(key)) {
    users.set(key, {
      id:           'demo-user',
      email:        key,
      name:         'Demo User',
      phone:        '204 555 0000',
      passwordHash: sha256('Demo123!'),
      token:        crypto.randomUUID(),
    })
    console.log('[demo] account seeded — demo@citysend.ca / Demo123!')
  }
})()

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, stripe: !!stripe, users: users.size }))

app.listen(PORT, () => console.log(`CitySend API → http://localhost:${PORT}`))
