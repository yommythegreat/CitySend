# CitySend Driver

Mobile-web driver app replacing the previous driver UI.

## Run

```bash
npm install
npm run dev
```

The local dev server uses port `5175`.

## Current Status

This app contains the production-ready driver flow UI extracted from the CitySend prototype:

- Driver dashboard and online/offline state
- Incoming job offer
- En route to pickup and drop-off
- Pickup confirmation
- Drop-off proof: photo, signature, or code
- Completion and earnings summary

It currently uses structured mock data in `src/features/driver/mockData.js`. The next integration step is to connect those state transitions to the existing shared CitySend backend models in `shared/` and Supabase order/driver stores.
