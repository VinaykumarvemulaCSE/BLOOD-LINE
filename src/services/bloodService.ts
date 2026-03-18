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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

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
    hospitalUid: form.hospitalUid ?? null,
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
  return requestRef.id;
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

export const verifyDonation = async (
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

      if (reqData.status !== "completed") {
        throw new Error("Donation must be marked as completed before verification");
      }

      transaction.update(reqRef, {
        status: "verified",
        verifiedBy: hospitalUid,
        verifiedByName: hospitalName,
        verifiedAt: new Date().toISOString(),
      });

      const donationsQuery = query(
        collection(db, "donations"),
        where("requestId", "==", reqId)
      );
      const donationsSnap = await getDocs(donationsQuery);

      donationsSnap.forEach((donationDoc) => {
        transaction.update(doc(db, "donations", donationDoc.id), {
          status: "verified",
          verifiedAt: new Date().toISOString(),
          verifiedBy: hospitalUid,
        });
      });
    });

    toast.success("Donation verified successfully!");
  } catch (error: any) {
    toast.error(error.message || "Failed to verify donation");
    throw error;
  }
};

export const completeDonation = async (
  reqId: string,
  donorId: string,
  bloodGroup: string
) => {
  try {
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

      const donationsQuery = query(
        collection(db, "donations"),
        where("requestId", "==", reqId)
      );
      const donationsSnap = await getDocs(donationsQuery);

      donationsSnap.forEach((donationDoc) => {
        transaction.update(doc(db, "donations", donationDoc.id), {
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

      const donationsQuery = query(
        collection(db, "donations"),
        where("requestId", "==", reqId),
        where("status", "!=", "verified")
      );
      const donationsSnap = await getDocs(donationsQuery);

      donationsSnap.forEach((donationDoc) => {
        transaction.update(doc(db, "donations", donationDoc.id), {
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
