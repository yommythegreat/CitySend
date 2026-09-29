// Supabase Edge Function: send-push
//
// Delivers iOS push notifications through Apple Push Notification service
// (APNs). Triggered by a Database Webhook on INSERT into public.notifications
// (the same rows the in-app notification bell shows).
//
//   audience 'customer' → devices in push_tokens for notifications.customer_id
//                         (app = 'customer')
//   audience 'driver'   → the driver's auth user (drivers.user_id for
//                         notifications.driver_id), app = 'driver'
//   audience 'admin'    → ignored here (send-admin-email handles it)
//
// Deployment (no CLI needed):
//   1. Supabase Dashboard → Edge Functions → Create new function → name: send-push
//   2. Paste this file's contents → Deploy
//   3. Edge Functions → Secrets — add:
//        APNS_KEY_ID       — Key ID of your APNs Auth Key (10 chars)
//        APNS_TEAM_ID      — your Apple Developer Team ID
//        APNS_PRIVATE_KEY  — full contents of the AuthKey_XXXXXXXXXX.p8 file
//      (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
//   4. Database → Webhooks → Create:
//        Table: public.notifications · Events: INSERT
//        Type: Supabase Edge Function · Function: send-push · Method: POST
//
// TestFlight and App Store builds use APNs production. Tokens from builds run
// straight from Xcode are "development" tokens; for those we retry against the
// sandbox endpoint automatically. Dead tokens (410 / BadDeviceToken on both)
// are deleted from push_tokens.

// deno-lint-ignore-file
// @ts-nocheck — Deno runtime; the repo's TypeScript checker doesn't apply here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BUNDLE_IDS: Record<string, string> = {
  customer: "com.citysend.customer",
  driver:   "com.citysend.driver",
}
const APNS_PROD    = "https://api.push.apple.com"
const APNS_SANDBOX = "https://api.sandbox.push.apple.com"

interface NotificationRow {
  id: string; event: string; audience: "customer" | "driver" | "admin" | "all"
  order_id?: string; title: string; body: string
  customer_id?: string | null; driver_id?: string | null
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
)

// ── APNs auth token (ES256 JWT, reused for up to 50 minutes) ─────────────────

let cachedJwt: { token: string; at: number } | null = null

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data)
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedJwt && now - cachedJwt.at < 50 * 60) return cachedJwt.token

  const keyId  = Deno.env.get("APNS_KEY_ID")
  const teamId = Deno.env.get("APNS_TEAM_ID")
  const pem    = Deno.env.get("APNS_PRIVATE_KEY")
  if (!keyId || !teamId || !pem) throw new Error("APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY not set")

  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
    c => c.charCodeAt(0),
  )
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])

  const header  = b64url(JSON.stringify({ alg: "ES256", kid: keyId }))
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now }))
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${payload}`))
  const token = `${header}.${payload}.${b64url(sig)}`
  cachedJwt = { token, at: now }
  return token
}

// ── Send ─────────────────────────────────────────────────────────────────────

async function sendOne(host: string, deviceToken: string, topic: string, n: NotificationRow) {
  const res = await fetch(`${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization:     `bearer ${await apnsJwt()}`,
      "apns-topic":      topic,
      "apns-push-type":  "alert",
      "apns-priority":   "10",
      "content-type":    "application/json",
    },
    body: JSON.stringify({
      aps: { alert: { title: n.title, body: n.body }, sound: "default" },
      event: n.event,
      orderId: n.order_id ?? "",
    }),
  })
  const reason = res.ok ? "" : ((await res.json().catch(() => ({})))?.reason ?? "")
  return { ok: res.ok, status: res.status, reason }
}

async function deliver(tokenRow: { id?: string; token: string; app: string; user_id: string; device_id: string; platform: string }, n: NotificationRow) {
  if (tokenRow.platform !== "ios") return { skipped: "android not configured" }
  const topic = BUNDLE_IDS[tokenRow.app]
  if (!topic) return { skipped: `unknown app ${tokenRow.app}` }

  let r = await sendOne(APNS_PROD, tokenRow.token, topic, n)
  // Development (Xcode-run) builds register sandbox tokens.
  if (!r.ok && r.reason === "BadDeviceToken") r = await sendOne(APNS_SANDBOX, tokenRow.token, topic, n)

  if (!r.ok && (r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered")) {
    await supabase.from("push_tokens").delete()
      .match({ user_id: tokenRow.user_id, app: tokenRow.app, platform: tokenRow.platform, device_id: tokenRow.device_id })
  }
  return r
}

async function recipients(n: NotificationRow): Promise<{ userId: string; app: string } | null> {
  if (n.audience === "customer" && n.customer_id) return { userId: n.customer_id, app: "customer" }
  if (n.audience === "driver" && n.driver_id) {
    const { data } = await supabase.from("drivers").select("user_id").eq("id", n.driver_id).maybeSingle()
    return data?.user_id ? { userId: data.user_id, app: "driver" } : null
  }
  return null
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const n: NotificationRow | undefined = payload?.record
    if (payload?.type !== "INSERT" || !n) return new Response("ignored", { status: 200 })

    const to = await recipients(n)
    if (!to) return new Response("no recipient", { status: 200 })

    const { data: tokens, error } = await supabase
      .from("push_tokens").select("*").eq("user_id", to.userId).eq("app", to.app)
    if (error) throw error
    if (!tokens?.length) return new Response("no devices", { status: 200 })

    const results = await Promise.all(tokens.map(t => deliver(t, n)))
    console.log("[send-push]", n.event, n.audience, JSON.stringify(results))
    return new Response(JSON.stringify(results), { status: 200, headers: { "content-type": "application/json" } })
  } catch (err) {
    console.error("[send-push] failed:", err?.message ?? err)
    // 200 so the webhook doesn't retry-storm; the error is in the function logs.
    return new Response(`error: ${err?.message ?? err}`, { status: 200 })
  }
})
