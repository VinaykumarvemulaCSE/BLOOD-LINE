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
  runTransaction,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { broadcastEmergencyRequest } from "./sosService";

export const createBloodRequest = async (
  profile: any,
  form: any,
  clientId: string
) => {
  const batch = writeBatch(db);

  const requestRef = doc(collection(db, "blood_requests"));
  batch.set(requestRef, {
    clientId,
    createdBy: profile.uid,
    creatorName: profile.name,
    creatorPhone: profile.phone,
    bloodGroup: form.bloodGroup,
    units: form.units,
    hospitalLocation: form.hospitalLocation,
    // Normalize empty-string hospitalUid to `null` so Firestore rules can reliably match hospitals.
    hospitalUid: form.hospitalUid || null,
    status: "open",
    emergency: form.emergency,
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
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  const requestId = requestRef.id;

  if (form.emergency) {
    broadcastEmergencyRequest(
      form.bloodGroup,
      profile.city || "",
      form.hospitalLocation,
      profile.phone || "",
      requestId
    ).catch((err) => console.error("Emergency broadcast failed:", err));
  }

  return requestId;
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
    where("status", "==", "open")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToAcceptedRequests = (donorId: string, callback: any) => {
  const q = query(
    collection(db, "blood_requests"),
    where("acceptedBy", "==", donorId),
    where("status", "in", ["accepted", "completed"])
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const acceptBloodRequest = async (
  reqId: string,
  donorId: string,
  donorName: string,
  donorPhone: string
) => {
  try {
    await runTransaction(db, async (transaction) => {
      const reqRef = doc(db, "blood_requests", reqId);
      const reqSnap = await transaction.get(reqRef);

      if (!reqSnap.exists()) {
        throw new Error("Request does not exist");
      }

      const reqData = reqSnap.data();

      if (reqData.status !== "open") {
        throw new Error("Request is no longer available");
      }

      if (reqData.acceptedBy) {
        throw new Error("Request already accepted by another donor");
      }

      transaction.update(reqRef, {
        status: "accepted",
        acceptedBy: donorId,
        acceptedDonorName: donorName,
        acceptedDonorPhone: donorPhone,
        acceptedAt: new Date().toISOString(),
      });

      const donationRef = doc(collection(db, "donations"));
      transaction.set(donationRef, {
        donorId,
        donorName,
        requestId: reqId,
        bloodGroup: reqData.bloodGroup,
        units: reqData.units,
        hospitalLocation: reqData.hospitalLocation,
        hospitalUid: reqData.hospitalUid,
        date: new Date().toISOString(),
        status: "scheduled",
        createdAt: serverTimestamp(),
      });
    });

    toast.success("Request accepted! Please visit the hospital ASAP.");
  } catch (error: any) {
    toast.error(error.message || "Failed to accept request");
    throw error;
  }
};

export const fulfillRequestFromInventory = async (
  reqId: string,
  hospitalUid: string,
  hospitalName: string
) => {
  try {
    await runTransaction(db, async (transaction) => {
      const reqRef = doc(db, "blood_requests", reqId);
      const reqSnap = await transaction.get(reqRef);

      if (!reqSnap.exists()) {
        throw new Error("Request not found");
      }

      const reqData = reqSnap.data();

      if (reqData.status !== "open") {
        throw new Error("Request is no longer available");
      }

      transaction.update(reqRef, {
        status: "verified",
        acceptedBy: hospitalUid,
        acceptedDonorName: `${hospitalName} (Hospital Inventory)`, 
        acceptedAt: new Date().toISOString(),
        verifiedBy: hospitalUid,
        verifiedByName: hospitalName,
        verifiedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      
      // Notify receiver
      if (reqData.createdBy) {
        const msg = `Your ${reqData.bloodGroup} request was fulfilled directly by ${hospitalName} from their inventory!`;
        transaction.set(doc(collection(db, "notifications")), {
          type: "request_fulfilled",
          message: msg,
          read: false,
          priority: "high",
          requestId: reqId,
          userId: reqData.createdBy,
          createdAt: serverTimestamp()
        });
      }
    });

  } catch (error: any) {
    throw error;
  }
};

export const verifyDonation = async (
  reqId: string,
  hospitalUid: string,
  hospitalName: string
) => {
  try {
    const donationsQuery = query(
      collection(db, "donations"),
      where("requestId", "==", reqId)
    );
    const donationsSnap = await getDocs(donationsQuery);
    const donationIds = donationsSnap.docs.map((d) => d.id);

    if (donationIds.length === 0) {
      throw new Error("No donations found for this request. Ensure the donor has marked the donation as complete.");
    }

    let reqData: { bloodGroup?: string; acceptedBy?: string; createdBy?: string; status?: string };
    await runTransaction(db, async (transaction) => {
      const reqRef = doc(db, "blood_requests", reqId);
      const reqSnap = await transaction.get(reqRef);

      if (!reqSnap.exists()) {
        throw new Error("Request not found");
      }

      reqData = reqSnap.data() as any;

      if (reqData.status !== "completed") {
        throw new Error("Donation must be marked as completed before verification");
      }

      // READ: Get donor data BEFORE any writes
      let donorSnap = null;
      let donorRef = null;
      if (reqData.acceptedBy) {
        donorRef = doc(db, "users", reqData.acceptedBy);
        donorSnap = await transaction.get(donorRef);
      }

      // WRITE: Update donations first, then blood_request
      donationIds.forEach((did) => {
        transaction.update(doc(db, "donations", did), {
          status: "verified",
          verifiedAt: new Date().toISOString(),
          verifiedBy: hospitalUid,
        });
      });

      transaction.update(reqRef, {
        status: "verified",
        verifiedBy: hospitalUid,
        verifiedByName: hospitalName,
        verifiedAt: new Date().toISOString(),
      });

      // WRITE: Update donor stats
      if (donorRef && donorSnap && donorSnap.exists()) {
        const dData = donorSnap.data();
        transaction.update(donorRef, {
          lastDonationDate: new Date().toISOString(),
          donorAvailability: false,
          reputationScore: (dData.reputationScore || 0) + 10
        });
      }
    });

    // Notify donor and receiver (outside transaction to avoid blocking)
    const donorId = reqData.acceptedBy;
    const createdBy = reqData.createdBy;
    const msg = `${reqData.bloodGroup} donation verified by ${hospitalName}. Thank you!`;
    const notifBase = { type: "donation_verified", message: msg, read: false, priority: "high" as const, requestId: reqId, createdAt: serverTimestamp() };
    try {
      if (donorId) {
        await addDoc(collection(db, "notifications"), { ...notifBase, userId: donorId });
      }
      if (createdBy && createdBy !== donorId) {
        await addDoc(collection(db, "notifications"), { ...notifBase, userId: createdBy });
      }
    } catch (notifErr) {
      console.warn("Notifications could not be sent:", notifErr);
    }

    toast.success("Donation verified successfully!");
  } catch (error: any) {
    const msg = error?.message || error?.code || "Failed to verify donation";
    toast.error(typeof msg === "string" ? msg : "Failed to verify donation");
    throw error;
  }
};

export const completeDonation = async (
  reqId: string,
  donorId: string,
  bloodGroup: string
) => {
  try {
    const donationsQuery = query(
      collection(db, "donations"),
      where("requestId", "==", reqId),
      where("donorId", "==", donorId)
    );
    const donationsSnap = await getDocs(donationsQuery);
    const donationIds = donationsSnap.docs.map((d) => d.id);

    await runTransaction(db, async (transaction) => {
      const reqRef = doc(db, "blood_requests", reqId);
      const reqSnap = await transaction.get(reqRef);

      if (!reqSnap.exists()) {
        throw new Error("Request not found");
      }

      const reqData = reqSnap.data();

      if (reqData.acceptedBy !== donorId) {
        throw new Error("You are not authorized to complete this donation");
      }

      if (reqData.status !== "accepted") {
        throw new Error("Request is not in accepted state");
      }

      transaction.update(reqRef, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      donationIds.forEach((did) => {
        transaction.update(doc(db, "donations", did), {
          status: "completed",
          bloodGroup,
          completedAt: new Date().toISOString(),
        });
      });
    });


    toast.success("Donation marked as complete! Waiting for hospital verification.");
  } catch (error: any) {
    toast.error(error.message || "Failed to complete donation");
    throw error;
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

export const cancelBloodRequest = async (
  reqId: string,
  userId: string,
  reason: string
) => {
  try {
    const donationsQuery = query(
      collection(db, "donations"),
      where("requestId", "==", reqId),
      where("status", "!=", "verified")
    );
    const donationsSnap = await getDocs(donationsQuery);
    const donationIds = donationsSnap.docs.map((d) => d.id);

    await runTransaction(db, async (transaction) => {
      const reqRef = doc(db, "blood_requests", reqId);
      const reqSnap = await transaction.get(reqRef);

      if (!reqSnap.exists()) {
        throw new Error("Request not found");
      }

      const reqData = reqSnap.data();

      if (reqData.createdBy !== userId) {
        throw new Error("You are not authorized to cancel this request");
      }

      if (reqData.status === "verified") {
        throw new Error("Cannot cancel a verified donation");
      }

      transaction.update(reqRef, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
      });

      donationIds.forEach((did) => {
        transaction.update(doc(db, "donations", did), {
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
        });
      });
    });

    toast.success("Blood request cancelled");
  } catch (error: any) {
    toast.error(error.message || "Failed to cancel request");
    throw error;
  }
};

export interface HospitalEntry {
  uid: string;
  name: string;
  city: string;
  address?: string;
  verified?: boolean;
}

export const subscribeToHospitals = (callback: (hospitals: HospitalEntry[]) => void) => {
  const q = query(collection(db, "hospitals"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as HospitalEntry)));
  });
};
