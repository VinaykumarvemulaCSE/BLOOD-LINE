/**
 * BloodLine Firestore Seeder
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE:
 *   1. Download your Firebase service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *      Save as `serviceAccountKey.json` in the project root (it's in .gitignore)
 *
 *   2. Install deps (one-time):
 *      npm install firebase-admin --save-dev
 *
 *   3. Run:
 *      node scripts/seed-firestore.mjs
 *
 * WHAT IT DOES:
 *   - Deletes all documents from: blood_requests, donations, messages,
 *     notifications, sos_alerts, contact_messages, counters
 *   - Leaves `users` and `hospitals` untouched (preserved across sessions)
 *   - Seeds fresh demo blood requests, a counter, and sample notifications
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// ── Config ─────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json";

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
} catch {
  console.error(
    `\n❌  Could not read "${SERVICE_ACCOUNT_PATH}".\n` +
    `   Download it from Firebase Console → Project Settings → Service Accounts.\n`
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const now = FieldValue.serverTimestamp();

// ── Helpers ─────────────────────────────────────────────────────────────────
async function deleteCollection(colName) {
  const snap = await db.collection(colName).get();
  if (snap.empty) {
    console.log(`  ↳ ${colName}: empty, skip`);
    return;
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ✓ ${colName}: deleted ${snap.docs.length} docs`);
}

// ── Collections to wipe ─────────────────────────────────────────────────────
const WIPE_COLLECTIONS = [
  "blood_requests",
  "donations",
  "messages",
  "notifications",
  "sos_alerts",
  "contact_messages",
  "counters",
];

// ── Seed data ────────────────────────────────────────────────────────────────
const BLOOD_REQUESTS = [
  {
    requestCode: "BLV0001",
    clientId: "seed-001",
    createdBy: "DEMO_RECEIVER_UID",
    creatorName: "Test Receiver",
    creatorPhone: "+91-9876543210",
    bloodGroup: "O+",
    units: 2,
    hospitalLocation: "Apollo Hospital, Hyderabad",
    hospitalUid: null,
    status: "open",
    emergency: false,
  },
  {
    requestCode: "BLV0002",
    clientId: "seed-002",
    createdBy: "DEMO_RECEIVER_UID",
    creatorName: "Test Receiver",
    creatorPhone: "+91-9876543210",
    bloodGroup: "A+",
    units: 1,
    hospitalLocation: "KIMS Hospital, Hyderabad",
    hospitalUid: null,
    status: "open",
    emergency: true,
  },
  {
    requestCode: "BLV0003",
    clientId: "seed-003",
    createdBy: "DEMO_RECEIVER_UID",
    creatorName: "Test Receiver",
    creatorPhone: "+91-9876543210",
    bloodGroup: "B-",
    units: 3,
    hospitalLocation: "Yashoda Hospital, Secunderabad",
    hospitalUid: null,
    status: "open",
    emergency: false,
  },
  {
    requestCode: "BLV0004",
    clientId: "seed-004",
    createdBy: "DEMO_RECEIVER_UID",
    creatorName: "Test Receiver",
    creatorPhone: "+91-9876543210",
    bloodGroup: "AB+",
    units: 2,
    hospitalLocation: "Care Hospital, Banjara Hills",
    hospitalUid: null,
    status: "open",
    emergency: false,
  },
  {
    requestCode: "BLV0005",
    clientId: "seed-005",
    createdBy: "DEMO_RECEIVER_UID",
    creatorName: "Test Receiver",
    creatorPhone: "+91-9876543210",
    bloodGroup: "O-",
    units: 1,
    hospitalLocation: "Osmania General Hospital, Hyderabad",
    hospitalUid: null,
    status: "open",
    emergency: true,
  },
];

const SEED_NOTIFICATIONS = [
  {
    type: "donation_verified",
    message: "🎉 Your blood donation has been verified! Thank you for saving a life.",
    userId: "DEMO_DONOR_UID",
    read: false,
    priority: "high",
    bloodGroup: "O+",
  },
  {
    type: "emergency_request",
    message: "URGENT: O+ blood needed at Apollo Hospital, Hyderabad. Contact: +91-9876543210",
    userId: "DEMO_DONOR_UID",
    read: false,
    priority: "high",
    bloodGroup: "O+",
    location: "Apollo Hospital, Hyderabad",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔥  BloodLine Firestore Seeder\n");

  // 1. Wipe collections
  console.log("Step 1: Wiping collections...");
  for (const col of WIPE_COLLECTIONS) await deleteCollection(col);

  // 2. Seed counter
  console.log("\nStep 2: Seeding counter...");
  await db.collection("counters").doc("blood_requests").set({
    count: BLOOD_REQUESTS.length,
  });
  console.log(`  ✓ counters/blood_requests: count=${BLOOD_REQUESTS.length}`);

  // 3. Seed blood requests
  console.log("\nStep 3: Seeding blood requests...");
  const commonFields = {
    acceptedBy: null,
    acceptedAt: null,
    acceptedDonorName: null,
    acceptedDonorPhone: null,
    verifiedBy: null,
    verifiedByName: null,
    verifiedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: now,
  };

  for (const req of BLOOD_REQUESTS) {
    await db.collection("blood_requests").add({ ...req, ...commonFields });
    console.log(`  ✓ ${req.requestCode} – ${req.bloodGroup} @ ${req.hospitalLocation}`);
  }

  // 4. Seed notifications
  console.log("\nStep 4: Seeding notifications...");
  for (const notif of SEED_NOTIFICATIONS) {
    await db.collection("notifications").add({ ...notif, createdAt: now });
    console.log(`  ✓ ${notif.type}`);
  }

  console.log("\n✅  Seeding complete!\n");
  console.log("Note: Users and hospitals were preserved.");
  console.log("Free-text tip: Log in as demo donor to see compatible requests, or as receiver to create new ones.\n");

  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
