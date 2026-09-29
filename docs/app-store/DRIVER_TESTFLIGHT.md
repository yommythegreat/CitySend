# CitySend Driver — TestFlight kit (iOS)

Bundle ID `com.citysend.driver` · iPhone-only · distributed to couriers through **TestFlight external testing** (not on the public App Store).

---

## 0. Before the first upload

1. **Run migration 023** (`supabase/migrations/023_delete_own_account_drivers.sql`) in the Supabase SQL editor. It makes *Profile → Delete account* anonymise the driver record and remove their live location. Without it, deletion only removes the login.
2. **Create the app record**: App Store Connect → Apps → **+** → New App → iOS, name `CitySend Driver`, bundle ID `com.citysend.driver`, SKU `citysend-driver`.
3. **Create a demo driver** for Beta App Review: sign up in the app with an address you control, then **approve it in admin**. Review can't use an account that's still waiting for approval.

## 1. Build and upload

```bash
cd apps/driver && npm run cap:ios
```

Then in Xcode:
- Signing & Capabilities: confirm **Push Notifications** and **Background Modes → Location updates** are listed. They come from the project, so there's nothing to add.
- General: Version `1.0`, **Build 1**. Increase the build number for every upload after that.
- Any iOS Device (arm64) → Product → **Archive** → Distribute App → App Store Connect → Upload.

## 2. TestFlight setup (App Store Connect → CitySend Driver → TestFlight)

**Test Information** (left sidebar):
- Beta App Description: `Driver app for CitySend couriers in Winnipeg: accept delivery jobs, navigate to pickup and drop-off, and complete proof of delivery.`
- Feedback email: your email
- Privacy Policy URL: `https://www.citysend.ca/privacy`
- **Sign-in required**: tick it and enter the approved demo driver account
- **Review notes**:

```
CitySend Driver is used by independent couriers who deliver CitySend orders in Winnipeg, Canada.

HOW TO TEST
• Sign in with the demo driver account provided.
• Jobs are dispatched by our operations team, so a job offer may not appear during review. The dashboard, profile, earnings and history screens are all available.

LOCATION
• While signed in with the app open, the driver's location is shared with our dispatch system to offer nearby jobs.
• Background location is used ONLY during an active delivery, so the customer can follow the courier on a live map while the driver navigates in Apple Maps or Google Maps. iOS shows the location indicator during this time. It stops when the delivery is completed and when the driver signs out.

OTHER PERMISSIONS
• Camera/Photos: proof-of-delivery photo at drop-off (optional).
• Notifications: requested after sign-in, for new job offers.

ACCOUNT DELETION
Profile → Delete account → Delete permanently.
```

**External Testing** → **+** → create a group called `Couriers` → add build 1 → **Submit for Review**. The first build gets a Beta App Review, usually within about a day. Later builds are often approved automatically.

**Inviting drivers:** either add their emails to the group, or turn on a **Public Link** and send it only to approved couriers. They install the **TestFlight** app, then CitySend Driver.

> TestFlight builds expire after **90 days**. Upload a new build (a higher build number) before then.

## 3. What to check on a real iPhone before inviting drivers

- Sign in → the notification prompt appears. Allow it.
- Accept a job → the location prompt appears (choose *Allow While Using App*).
- During the job, switch to Apple Maps for a few minutes → the blue location pill shows, and the customer's tracking map keeps moving.
- Complete the delivery → the blue pill disappears.
- Proof-of-delivery photo → the camera opens.
