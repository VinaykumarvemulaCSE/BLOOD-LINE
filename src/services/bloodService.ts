import {
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Blood Requests ──────────────────────────────────────────

export const createBloodRequest = async (
  profile: any,
  form: any,
  clientId: string
) => {
  return await addDoc(collection(db, "blood_requests"), {
    clientId,
    createdBy: profile.uid,
    creatorName: profile.name,
    bloodGroup: form.bloodGroup,
    units: form.units,
    hospitalLocation: form.hospitalLocation,
    hospitalUid: form.hospitalUid ?? null,
    status: "active",
    emergency: form.emergency,
    acceptedBy: null,
    acceptedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToUserRequests = (userId: string, callback: any) => {
  const q = query(
    collection(db, "blood_requests"),
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
};

export const subscribeToActiveRequests = (callback: any) => {
  const q = query(
    collection(db, "blood_requests"),
    where("status", "==", "active")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToAcceptedRequests = (donorId: string, callback: any) => {
  const q = query(
    collection(db, "blood_requests"),
    where("acceptedBy", "==", donorId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// Donor accepts a blood request
export const acceptBloodRequest = async (reqId: string, donorId: string) => {
  await updateDoc(doc(db, "blood_requests", reqId), {
    status: "accepted",
    acceptedBy: donorId,
    acceptedAt: new Date().toISOString(),
  });
  // Create donation record
  await addDoc(collection(db, "donations"), {
    donorId,
    requestId: reqId,
    date: new Date().toISOString(),
    status: "scheduled",
  });
};

// Hospital verifies the donation
export const verifyDonation = async (reqId: string, hospitalUid: string, hospitalName: string) => {
  await updateDoc(doc(db, "blood_requests", reqId), {
    status: "verified",
    verifiedBy: hospitalUid,
    verifiedByName: hospitalName,
    verifiedAt: new Date().toISOString(),
  });
  // Update donation record too
  const q = query(collection(db, "donations"), where("requestId", "==", reqId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(doc(db, "donations", d.id), {
      status: "verified",
      verifiedAt: new Date().toISOString(),
    });
  }
};

// Donor marks donation as complete (after physical donation)
export const completeDonation = async (
  reqId: string,
  donorId: string,
  bloodGroup: string
) => {
  await updateDoc(doc(db, "blood_requests", reqId), {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
  const q = query(collection(db, "donations"), where("requestId", "==", reqId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(doc(db, "donations", d.id), {
      status: "completed",
      bloodGroup,
      completedAt: new Date().toISOString(),
    });
  }
};

export const updateDonorAfterDonation = async (
  updateProfile: any,
  currentScore: number = 0
) => {
  await updateProfile({
    lastDonationDate: new Date().toISOString(),
    reputationScore: currentScore + 10,
    donorAvailability: false,
  });
};

// ── Hospitals ────────────────────────────────────────────────

export interface HospitalEntry {
  uid: string;
  name: string;
  city: string;
  address?: string;
}

export const subscribeToHospitals = (callback: (hospitals: HospitalEntry[]) => void) => {
  const q = query(collection(db, "hospitals"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as HospitalEntry)));
  });
};
