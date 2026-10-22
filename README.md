# 🩸 BloodLine

A real-time blood donation platform where a request moves from emergency post to verified donation in one flow.

**Live:** https://blood-line-2007.vercel.app

[![BloodLine dashboard](https://res.cloudinary.com/dgelvlvqs/image/upload/w_1200,q_auto,f_auto/v1792617718/portfolio/hgf5kdbmzj1fgkjsafzu.png)](https://blood-line-2007.vercel.app)

## What it does

**Receivers** post a blood request or fire a one-tap SOS, then watch who accepted and where the request stands.

**Donors** see open requests that match their blood group, accept one, and track their eligibility, cooldown and reputation score.

**Hospitals** keep per-blood-group inventory, fulfil requests straight from stock, and verify completed donations.

**Admins** watch the whole pipeline: users, requests, donations, notification broadcasts and the contact inbox.

## Stack

- **Frontend** — React 18 + TypeScript, built with Vite 5
- **UI** — Tailwind CSS, shadcn/ui, Framer Motion
- **Data** — Firebase Authentication (email/password + Google), Cloud Firestore (real-time listeners + transactions)
- **Routing** — React Router 6
- **State** — React Context
- **Icons / toasts** — Lucide, Sonner

## Architecture

Four roles — donor, receiver, hospital, admin — share one user profile document with a `role` field, and each gets its own guarded dashboard. Ten collections carry the system: `users`, `blood_requests`, `donations`, `hospitals`, `hospital_inventory`, `notifications`, `messages`, `sos_alerts`, `contact_messages` and `counters`.

Requests move through `open → accepted → completed → verified`, with `cancelled` available before completion. Every transition is written inside a Firestore transaction: when two donors tap accept on the same urgent request at once, the second transaction re-reads the document and is rejected instead of silently overwriting the first donor.

The request code is issued from a `counters` document inside the same transaction that creates the request, so codes stay sequential without collisions.

Eligibility is never donor-reported. A donor can accept a request, but the 90-day cooldown and reputation points are written only on the hospital verification path — a pledge and a verified donation are separate states.

Hospitals can fulfil a request from inventory; the units are deducted per blood group in the same transaction that closes the request, so stock cannot drift from the request state.

Firestore security rules resolve the caller's role from their profile document and enforce it server-side: guests read open requests only, receivers read their own, donors read open, hospitals and admins read all. Role escalation from the client is not possible.

## Emergency SOS

A receiver in an emergency can broadcast instead of filling a form. The SOS service reads the receiver's city and blood group, finds donors in that city with a compatible group, raises a linked blood request, creates the SOS alert and notifies the matching donors — all inside one transaction that also issues the request code.

## Demo

The login page has one-click demo buttons for all four roles, so the pipeline can be explored without signing up. All demo data is synthetic and disposable.

## Getting started

Prerequisites: Node.js 20+ and a Firebase project with Authentication (email/password + Google) and Firestore enabled.

```bash
git clone https://github.com/VinaykumarvemulaCSE/BLOOD-LINE.git
cd BLOOD-LINE
npm install
cp .env.example .env    # Windows: copy .env.example .env
```

Fill the `VITE_FIREBASE_*` values in `.env` from your Firebase project settings — the app reads them at build time in `src/lib/firebase.ts`.

```bash
npm run dev
```

Open http://localhost:5173.

### Optional: seed demo data

The seed script uses the Admin SDK, so it needs a service account key saved as `serviceAccountKey.json` in the project root (already gitignored).

```bash
npm install firebase-admin --save-dev
npm run db:seed
```

It is destructive. It deletes every document in `blood_requests`, `donations`, `messages`, `notifications`, `sos_alerts`, `contact_messages` and `counters`, then re-creates the demo accounts, requests across every pipeline state, donations, hospital inventory and notifications. Never run it against data you care about.

### Deploy Firestore rules

```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

## Deployment

The frontend is a static SPA. On Vercel: import the repo, keep the detected Vite settings (`npm run build`, output `dist`), and set the same `VITE_FIREBASE_*` variables in the project's environment settings.

## Known limitations

- Emergency alerts are in-app only; there is no SMS or push channel yet, so a donor has to have the app open or come back to it.
- Hospital verification is manual — the platform records the decision, it does not verify the donation itself.
- Demo data is scoped to one city (Hyderabad), so city filtering is easy to demonstrate but not stress-tested.
- No payments or donor rewards, no automated tests or CI yet.
- Firestore is initialised with `experimentalForceLongPolling`. Proxies and some corporate networks stall the default streaming channel, which leaves every listener silently empty; long polling costs a little latency and makes the dashboards reliable on those networks.

## License

Academic project. Not licensed for commercial use.
