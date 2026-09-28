# CitySend — App Store submission kit (iOS customer app)

Everything App Store Connect asks for, ready to copy. Bundle ID: `com.citysend.customer`.

---

## 0. Readiness checklist (what Apple checks)

| Apple requirement | Status |
|---|---|
| App works end to end, no crashes (Guideline 2.1) | ✅ Tested on Simulator |
| Reviewer can use the app from outside Winnipeg | ✅ Defaults to Winnipeg when location isn't a supported city |
| In-app account deletion (5.1.1(v)) | ✅ Profile → Settings → Delete account (migration 022 applied) |
| Privacy policy URL opens the policy (5.1.1(i)) | ✅ once `fix/app-review-readiness` is deployed |
| Privacy policy covers location, notifications, deletion | ✅ updated September 2026 |
| Permission purpose string for location (5.1.1) | ✅ in Info.plist |
| Notification prompt shown in context, not at launch | ✅ after first order |
| Physical service paid via Stripe, not In-App Purchase (3.1.3(e)) | ✅ allowed — explain in review notes |
| No third-party social login → Sign in with Apple not required (4.8) | ✅ email/password + guest only |
| App icon 1024×1024, no transparency | ✅ checked |
| Export compliance | ✅ `ITSAppUsesNonExemptEncryption = false` |
| iPhone only (no iPad layout issues) | ✅ remove Mac + Apple Vision in Supported Destinations |
| **Demo account for login-only features** | ⬜ **You create it — see §6** |
| **Screenshots (6.9" iPhone)** | ⬜ Capture from Simulator — see §7 |
| **Build includes the latest privacy text** | ⬜ Upload build 2 after merging — see §8 |

---

## 1. App Information

| Field | Value |
|---|---|
| **Name** (≤30) | `CitySend` |
| **Subtitle** (≤30) | `Same-day delivery in Winnipeg` |
| **Primary category** | Business |
| **Secondary category** | Utilities |
| **Content rights** | "Contains third-party content?" → **Yes** (map tiles from OpenStreetMap, open licence, attributed in-app) → "Have necessary rights?" → **Yes** |
| **Age rating** | Answer **None / No** to every content question → expected **4+**. If asked about in-app messaging/chat, answer truthfully (customers can message their courier about the delivery). |
| **Price** | Free |
| **Availability** | Canada (recommended for launch — service is Winnipeg-only) |

---

## 2. Version 1.0 — text fields

**Promotional text** (≤170, can be changed without a new build)
```
Send anything that fits in a car across Winnipeg — today. Book in under a minute, track your courier live, and share a secure handoff code with your recipient.
```

**Keywords** (≤100, comma-separated, no spaces after commas — words already in the name/subtitle are omitted on purpose)
```
courier,package,parcel,send,errand,local,express,documents,keys,cake,gift,urgent,drop off,pickup
```

**Description** (≤4000)
```
CitySend is same-day delivery across Winnipeg for anything that fits in a car — documents, keys, cakes, gifts, laptops, and everything in between.

BOOK IN UNDER A MINUTE
Enter the pickup and drop-off, tell us what you're sending, and see your price upfront — taxes included, no surprises.

DELIVERY ON YOUR SCHEDULE
• Express — a courier is dispatched right away.
• Morning window — 10 AM to 2 PM.
• Evening window — 6 PM to 10 PM.
Scheduled windows can be booked for today or roll to the next day automatically.

TRACK IT LIVE
Follow your courier on the map from pickup to drop-off, with status updates at every step.

SECURE HANDOFF CODE
Every delivery gets a 4-digit handoff code. Text it to your recipient in one tap — the courier asks for it at the door, so your parcel only goes to the right person.

NO ACCOUNT NEEDED
Check out as a guest, or create a free account to save your favourite places and see your delivery history and receipts.

SECURE PAYMENTS
Pay by card, processed securely by Stripe. CitySend never stores your full card number.

CitySend currently operates in Winnipeg, Manitoba. More cities are coming soon.

Questions? support@citysend.ca
```

| Field | Value |
|---|---|
| **Support URL** | `https://www.citysend.ca` |
| **Marketing URL** (optional) | `https://www.citysend.ca` |
| **Privacy Policy URL** | `https://www.citysend.ca/privacy` |
| **Copyright** | `2026 CitySend Delivery Co.` |
| **What's New** | Not needed for version 1.0 |

---

## 3. App Privacy ("nutrition label")

App Store Connect → App Privacy → **Get Started**.

- **Do you or your third-party partners collect data from this app?** → **Yes**
- **Used for tracking?** → **No** for every data type (no ads, no cross-app tracking).

| Data type | Collected? | Purpose | Linked to user? |
|---|---|---|---|
| Contact Info → **Name** | Yes | App Functionality | Yes |
| Contact Info → **Email Address** | Yes | App Functionality | Yes |
| Contact Info → **Phone Number** | Yes | App Functionality | Yes |
| Contact Info → **Physical Address** (pickup/drop-off) | Yes | App Functionality | Yes |
| Location → **Precise Location** | Yes | App Functionality | No |
| Financial Info → **Payment Info** (via Stripe) | Yes | App Functionality | Yes |
| Purchases → **Purchase History** (orders) | Yes | App Functionality | Yes |
| Identifiers → **User ID** | Yes | App Functionality | Yes |
| Identifiers → **Device ID** (push token) | Yes | App Functionality | Yes |
| Everything else (health, contacts, photos, browsing, search, usage analytics, crash data, ads data…) | **No** | — | — |

These are deliberately conservative — declaring slightly more than strictly required is safe; declaring less is a rejection risk.

---

## 4. Pricing & payments justification (for reviewers)

CitySend sells a **physical, real-world service** (a courier moving a parcel across the city). Under Guideline **3.1.3(e)**, goods and services consumed outside the app must **not** use In-App Purchase; payment via Stripe is correct.

---

## 5. App Review Information

| Field | Value |
|---|---|
| **Contact first/last name** | Abayomi Agboluaje |
| **Contact email** | agboluajeabayomi@gmail.com |
| **Contact phone** | *(your phone number)* |
| **Sign-in required** | Tick **Yes** and enter the demo account from §6 |

**Notes** (paste into the Notes field)
```
CitySend is a same-day courier service operating in Winnipeg, Manitoba, Canada.

HOW TO TEST
• No account is needed for the core flow: tap "Send a package" → "Continue as guest". Your location outside Winnipeg is fine — the app defaults to Winnipeg.
• Use Winnipeg addresses, e.g. pickup "134 Princess St, Winnipeg" and drop-off "88 Osborne St, Winnipeg".
• You can go through the entire booking flow — delivery window, upfront price, and the card payment screen. Completing a payment places a real, paid courier order in Winnipeg; if one is placed during review we will cancel and fully refund it.
• After booking, the tracking screen shows the order status and a 4-digit handoff code with a one-tap "Text the code to recipient" button (opens Messages).

ACCOUNT FEATURES (demo account provided)
• Profile, saved places, delivery history and receipts.
• Account deletion: Profile → Settings (gear icon) → Danger zone → Delete account → Delete permanently.

PAYMENTS
CitySend sells a physical courier service delivered outside the app, so payments are processed by Stripe rather than In-App Purchase (Guideline 3.1.3(e)).

PERMISSIONS
• Location (while in use): detects the user's city and helps fill the pickup address.
• Notifications: requested only after the first order, to send delivery updates.
```

---

## 6. Demo account (you create this)

1. On your phone or citysend.ca, create an account with an address you control, e.g. `agboluajeabayomi+appreview@gmail.com` (arrives in your normal inbox).
2. Choose a password (don't reuse a real one) and confirm the email if asked.
3. Sign in once and add a saved place so the account screens aren't empty.
4. Enter the email and password in App Review Information → Sign-in information.

The reviewer may test **Delete account** with it — that's expected. Recreate it before any future submission.

---

## 7. Screenshots

Required: **6.9" iPhone display** (1320 × 2868) — the iPhone 17 Pro Max Simulator's native size. 3–10 images; suggested set:

1. Home — "Send a package"
2. Booking — delivery window selector with upfront price
3. Payment summary
4. Live tracking with the handoff code card
5. Scheduled delivery confirmation (Booking Confirmed)

Smaller iPhone sizes are generated from these automatically.

---

## 8. Build to submit

The privacy-policy text also ships inside the app. Build **1.0 (1)** was archived before the policy update, so after merging `fix/app-review-readiness`:

1. `cd app && npm run cap:ios`
2. Xcode → General → **Build = 2** (version stays 1.0)
3. Any iOS Device (arm64) → Product → Archive → Distribute App → App Store Connect
4. In App Store Connect, attach **build 2** to version 1.0, then **Add for Review → Submit**.
