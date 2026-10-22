/**
 * BloodLine Firestore Seeder (v2)
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
 *   - Upserts the demo donor / receiver / hospital accounts (login + profile)
 *   - Adds extra donor + hospital profiles so the public counters are real
 *   - Seeds requests across every pipeline state, donations, hospital inventory
 *     and notifications
 *
 * WARNING: destructive. Never run it against data you care about.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// ── Config ─────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json";
const DEMO_PASSWORD = "BloodLine@Test2026";

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
// gRPC is unreliable on some networks; REST is slower but far more robust.
db.settings({ preferRest: true });
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;
const now = FieldValue.serverTimestamp();
const iso = (daysAgo = 0) =>
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

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

/** Create the auth user if missing, then upsert the matching profile document. */
async function ensureDemoUser(email, profile) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password: DEMO_PASSWORD, emailVerified: true });
    console.log(`  + auth user created: ${email}`);
  }

  await db
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        email,
        createdAt: profile.createdAt ?? iso(),
        ...profile,
      },
      { merge: true }
    );

  console.log(`  ✓ profile: ${profile.name} (${profile.role})`);
  return user.uid;
}

/** Plain profile with no auth account — deterministic id keeps re-runs idempotent. */
async function addProfile(id, profile) {
  await db
    .collection("users")
    .doc(id)
    .set({ email: "", createdAt: iso(), ...profile }, { merge: true });
  console.log(`  ✓ profile: ${profile.name} (${profile.role})`);
  return id;
}

/** Remove seed profiles left behind by older runs that used random ids. */
async function cleanupStaleSeeds(knownIds, names) {
  const snap = await db.collection("users").get();
  let removed = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.email || knownIds.includes(doc.id) || !names.includes(data.name)) continue;
    await doc.ref.delete();
    console.log(`  - removed stale seed profile: ${data.name} (${doc.id})`);
    removed += 1;
  }
  if (removed === 0) console.log("  ↳ no stale seed profiles");
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

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔥  BloodLine Firestore Seeder v2\n");

  // 1. Wipe
  console.log("Step 1: Wiping collections...");
  for (const col of WIPE_COLLECTIONS) await deleteCollection(col);

  // 2. Demo accounts + supporting profiles
  console.log("\nStep 2: Upserting demo users...");
  const donorUid = await ensureDemoUser("test.donor@bloodline.app", {
    name: "Test Donor",
    phone: "+91 98765 43210",
    bloodGroup: "O+",
    city: "Hyderabad",
    address: "Banjara Hills, Hyderabad",
    role: "donor",
    age: 28,
    weight: 68,
    healthConfirmed: true,
    lastDonationDate: iso(40), // 50 days of cooldown left
    donorAvailability: true,
    reputationScore: 140,
    profileCompleted: true,
  });

  const receiverUid = await ensureDemoUser("test.receiver@bloodline.app", {
    name: "Test Receiver",
    phone: "+91 98765 43211",
    bloodGroup: "A+",
    city: "Hyderabad",
    address: "Jubilee Hills, Hyderabad",
    role: "receiver",
    age: 32,
    weight: 70,
    healthConfirmed: true,
    lastDonationDate: null,
    donorAvailability: false,
    reputationScore: 40,
    profileCompleted: true,
  });

  const hospitalUid = await ensureDemoUser("test.hospital@bloodline.app", {
    name: "Test Hospital",
    phone: "+91 40 2345 6789",
    bloodGroup: "O+",
    city: "Hyderabad",
    address: "Apollo Hospital, Jubilee Hills, Hyderabad",
    role: "hospital",
    age: 40,
    weight: 70,
    healthConfirmed: true,
    lastDonationDate: null,
    donorAvailability: false,
    reputationScore: 0,
    profileCompleted: true,
  });

  const extraDonors = [];
  for (const [slug, name, group, city] of [
    ["priya", "Priya Sharma", "A+", "Hyderabad"],
    ["arjun", "Arjun Reddy", "B+", "Secunderabad"],
    ["sneha", "Sneha Rao", "AB+", "Hyderabad"],
  ]) {
    extraDonors.push(
      await addProfile(`seed-donor-${slug}`, {
        name,
        phone: "+91 90000 0000" + (extraDonors.length + 1),
        bloodGroup: group,
        city,
        address: `${city}, Telangana`,
        role: "donor",
        age: 26,
        weight: 62,
        healthConfirmed: true,
        lastDonationDate: iso(120),
        donorAvailability: true,
        reputationScore: 90,
        profileCompleted: true,
      })
    );
  }

  const hospital2Uid = await addProfile("seed-hospital-kims", {
    name: "KIMS Hospital",
    phone: "+91 40 4488 5000",
    bloodGroup: "O+",
    city: "Secunderabad",
    address: "KIMS Hospital, Minister Road, Secunderabad",
    role: "hospital",
    age: 40,
    weight: 70,
    healthConfirmed: true,
    lastDonationDate: null,
    donorAvailability: false,
    reputationScore: 0,
    profileCompleted: true,
  });

  await cleanupStaleSeeds(
    [...extraDonors, hospital2Uid],
    ["Priya Sharma", "Arjun Reddy", "Sneha Rao", "KIMS Hospital"]
  );

  // 3. Hospital inventory
  console.log("\nStep 3: Seeding hospital inventory...");
  const inventory = { "A+": 12, "A-": 4, "B+": 9, "B-": 3, "AB+": 5, "AB-": 2, "O+": 14, "O-": 6 };
  await db.collection("hospital_inventory").doc(hospitalUid).set(inventory);
  await db.collection("hospital_inventory").doc(hospital2Uid).set({
    "A+": 6, "A-": 1, "B+": 4, "B-": 0, "AB+": 2, "AB-": 1, "O+": 8, "O-": 3,
  });
  console.log("  ✓ inventory for 2 hospitals");

  // 4. Requests across every pipeline state
  console.log("\nStep 4: Seeding blood requests...");

  const baseRequest = {
    clientId: "seed",
    createdBy: receiverUid,
    creatorName: "Test Receiver",
    creatorPhone: "+91 98765 43211",
    hospitalUid: null,
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

  const addRequest = async (data) => {
    const ref = await db.collection("blood_requests").add({ ...baseRequest, ...data });
    return ref.id;
  };

  const openRequests = [
    ["O+", 2, "Apollo Hospital, Hyderabad", false],
    ["A+", 1, "KIMS Hospital, Hyderabad", true],
    ["B-", 3, "Yashoda Hospital, Secunderabad", false],
    ["AB+", 2, "Care Hospital, Banjara Hills", false],
    ["O-", 1, "Osmania General Hospital, Hyderabad", true],
  ];
  for (const [i, [group, units, location, emergency]] of openRequests.entries()) {
    await addRequest({
      requestCode: `BLV${String(i + 1).padStart(4, "0")}`,
      bloodGroup: group,
      units,
      hospitalLocation: location,
      status: "open",
      emergency,
    });
    console.log(`  ✓ BLV${String(i + 1).padStart(4, "0")} open · ${group}`);
  }

  const acceptedRequestId = await addRequest({
    requestCode: "BLV0006",
    bloodGroup: "O+",
    units: 1,
    hospitalLocation: "Apollo Hospital, Hyderabad",
    status: "accepted",
    emergency: false,
    acceptedBy: donorUid,
    acceptedAt: iso(1),
    acceptedDonorName: "Test Donor",
    acceptedDonorPhone: "+91 98765 43210",
  });

  const pendingVerifyId = await addRequest({
    requestCode: "BLV0007",
    bloodGroup: "A+",
    units: 2,
    hospitalLocation: "Apollo Hospital, Hyderabad",
    status: "completed",
    emergency: false,
    acceptedBy: donorUid,
    acceptedAt: iso(3),
    acceptedDonorName: "Test Donor",
    acceptedDonorPhone: "+91 98765 43210",
    completedAt: iso(1),
    hospitalUid,
  });
  console.log("  ✓ BLV0006 accepted · BLV0007 awaiting verification");

  const verifiedRequests = [];
  for (let i = 0; i < 6; i += 1) {
    const isDemoDonor = i < 3;
    const id = await addRequest({
      requestCode: `BLV${String(1008 + i)}`,
      bloodGroup: ["O+", "A+", "B+", "AB+", "O-", "A-"][i],
      units: 1,
      hospitalLocation: i % 2 === 0 ? "Apollo Hospital, Hyderabad" : "KIMS Hospital, Secunderabad",
      status: "verified",
      emergency: false,
      acceptedBy: isDemoDonor ? donorUid : extraDonors[i % extraDonors.length],
      acceptedAt: iso(20 + i),
      acceptedDonorName: isDemoDonor ? "Test Donor" : "Demo Donor",
      acceptedDonorPhone: "+91 98765 43210",
      verifiedBy: i % 2 === 0 ? hospitalUid : hospital2Uid,
      verifiedByName: i % 2 === 0 ? "Test Hospital" : "KIMS Hospital",
      verifiedAt: iso(10 + i),
      completedAt: iso(12 + i),
      hospitalUid: i % 2 === 0 ? hospitalUid : hospital2Uid,
    });
    verifiedRequests.push(id);
  }
  console.log("  ✓ 6 verified requests");

  // 5. Donations
  console.log("\nStep 5: Seeding donations...");
  const donationBase = {
    hospitalLocation: "Apollo Hospital, Hyderabad",
    hospitalUid,
    createdAt: now,
  };

  await db.collection("donations").add({
    ...donationBase,
    donorId: donorUid,
    donorName: "Test Donor",
    requestId: acceptedRequestId,
    bloodGroup: "O+",
    units: 1,
    date: iso(1),
    status: "scheduled",
  });

  await db.collection("donations").add({
    ...donationBase,
    donorId: donorUid,
    donorName: "Test Donor",
    requestId: pendingVerifyId,
    bloodGroup: "A+",
    units: 2,
    date: iso(3),
    status: "completed",
    completedAt: iso(1),
  });

  for (const [i, requestId] of verifiedRequests.entries()) {
    await db.collection("donations").add({
      ...donationBase,
      donorId: i < 3 ? donorUid : extraDonors[i % extraDonors.length],
      donorName: i < 3 ? "Test Donor" : "Demo Donor",
      requestId,
      bloodGroup: ["O+", "A+", "B+", "AB+", "O-", "A-"][i],
      units: 1,
      date: iso(12 + i),
      status: "verified",
      completedAt: iso(12 + i),
      verifiedAt: iso(10 + i),
      verifiedBy: i % 2 === 0 ? hospitalUid : hospital2Uid,
    });
  }
  console.log("  ✓ 1 scheduled · 1 completed · 6 verified");

  // 6. Notifications (real UIDs this time)
  console.log("\nStep 6: Seeding notifications...");
  const notifications = [
    {
      type: "donation_verified",
      message: "🎉 Your blood donation has been verified! Thank you for saving a life.",
      userId: donorUid,
      read: false,
      priority: "high",
      bloodGroup: "O+",
    },
    {
      type: "emergency_request",
      message: "URGENT: O- blood needed at Osmania General Hospital, Hyderabad.",
      userId: donorUid,
      read: false,
      priority: "high",
      bloodGroup: "O-",
      location: "Osmania General Hospital, Hyderabad",
    },
    {
      type: "request_fulfilled",
      message: "A+ blood was fulfilled from hospital inventory.",
      userId: receiverUid,
      read: false,
      priority: "high",
      bloodGroup: "A+",
    },
    {
      type: "donation_pending",
      message: "1 donation is waiting for your verification.",
      userId: hospitalUid,
      read: false,
      priority: "high",
      bloodGroup: "A+",
    },
  ];
  for (const notif of notifications) {
    await db.collection("notifications").add({ ...notif, createdAt: now });
  }
  console.log(`  ✓ ${notifications.length} notifications`);

  // 7. Request counter
  console.log("\nStep 7: Seeding counter...");
  const requestCount = openRequests.length + 1 + 1 + verifiedRequests.length;
  await db.collection("counters").doc("blood_requests").set({ count: requestCount });
  console.log(`  ✓ counters/blood_requests: count=${requestCount}`);

  console.log("\n✅  Seeding complete!\n");
  console.log("Demo logins (password for all): " + DEMO_PASSWORD);
  console.log("  donor     test.donor@bloodline.app");
  console.log("  receiver  test.receiver@bloodline.app");
  console.log("  hospital  test.hospital@bloodline.app");
  console.log("  admin     demo.admin@bloodline.app (Bloodline@Demo2026)\n");

  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
