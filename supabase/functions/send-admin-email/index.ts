// Supabase Edge Function: send-admin-email
//
// Receives a Database Webhook payload when a row is inserted into
// public.notifications. If audience='admin', forwards the notification to
// Resend, which delivers it to the configured admin email address.
//
// Deployment (no CLI needed):
//   1. Supabase Dashboard → Edge Functions → Create new function
//   2. Name it: send-admin-email
//   3. Paste this file's contents
//   4. Set the 3 secrets under Edge Functions → Secrets (or Project Settings → Functions):
//        RESEND_API_KEY  — your Resend API key (re_...)
//        FROM_EMAIL      — e.g. notifications@citysend.ca (verified domain in Resend)
//        ADMIN_EMAIL     — recipient (e.g. yommykixz@gmail.com)
//   5. Deploy
//   6. Create a Database Webhook (Database → Webhooks → Create):
//        Table:     public.notifications
//        Events:    INSERT
//        Type:      Supabase Edge Function
//        Function:  send-admin-email
//        Method:    POST
//
// Triggering: rows inserted into public.notifications with audience='admin'
// will fire this function. The function silently no-ops for other audiences,
// so the same webhook can later cover customer/driver channels.

// deno-lint-ignore-file
// @ts-nocheck — running in Deno, not Node. Local TypeScript checker doesn't apply here.

const RESEND_ENDPOINT = "https://api.resend.com/emails"

interface NotificationRow {
  id:         string
  event:      string
  audience:   "customer" | "driver" | "admin" | "all"
  order_id?:  string
  title:      string
  body:       string
  customer_id?: string | null
  driver_id?:   string | null
  created_at: string
  read:       boolean
}

interface WebhookPayload {
  type:    string        // "INSERT" | "UPDATE" | "DELETE"
  table:   string        // "notifications"
  schema:  string        // "public"
  record:  NotificationRow
  old_record?: NotificationRow | null
}

function html(notif: NotificationRow): string {
  const orderLine = notif.order_id
    ? `<p style="color:#6b7280; font-size:13px;">Order: <strong>${notif.order_id}</strong></p>`
    : ""
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; color:#111827; max-width:560px;">
      <h2 style="margin:0 0 8px 0; font-size:18px;">${escapeHtml(notif.title)}</h2>
      <p style="line-height:1.5; font-size:14px;">${escapeHtml(notif.body)}</p>
      ${orderLine}
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
      <p style="color:#9ca3af; font-size:11px;">
        CitySend admin notification · ${new Date(notif.created_at).toLocaleString("en-CA")}
      </p>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

Deno.serve(async (req: Request) => {
  // Tolerate health-check pings
  if (req.method === "GET") return new Response("send-admin-email ok", { status: 200 })

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response("invalid JSON", { status: 400 })
  }

  // Only act on INSERT events for the notifications table
  if (payload.type !== "INSERT" || payload.table !== "notifications") {
    return new Response("skipped: not a notifications INSERT", { status: 200 })
  }

  const notif = payload.record
  if (!notif) {
    return new Response("missing record", { status: 400 })
  }

  // Only admin-audience notifications get emailed (customer/driver channels
  // will be added later — WhatsApp / push).
  if (notif.audience !== "admin") {
    return new Response(`skipped: audience='${notif.audience}'`, { status: 200 })
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
  const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")     // e.g. notifications@citysend.ca
  const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")    // e.g. yommykixz@gmail.com

  if (!RESEND_API_KEY || !FROM_EMAIL || !ADMIN_EMAIL) {
    console.error("[send-admin-email] missing one of RESEND_API_KEY / FROM_EMAIL / ADMIN_EMAIL secrets")
    return new Response("server not configured", { status: 500 })
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    `CitySend <${FROM_EMAIL}>`,
      to:      [ADMIN_EMAIL],
      subject: notif.title,
      html:    html(notif),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[send-admin-email] Resend error", res.status, text)
    return new Response(`Resend error: ${res.status}`, { status: 502 })
  }

  const data = await res.json().catch(() => ({} as any))
  console.log("[send-admin-email] sent", { resendId: data?.id, to: ADMIN_EMAIL, title: notif.title })
  return new Response("ok", { status: 200 })
})
