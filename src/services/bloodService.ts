import {
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ✅ Named export
export const createBloodRequest = async (profile: any, form: any, clientId: string) => {
  return await addDoc(collection(db, "blood_requests"), {
    clientId, // 🔴 important
    createdBy: profile.uid,
    creatorName: profile.name,
    bloodGroup: form.bloodGroup,
    units: form.units,
    hospitalLocation: form.hospitalLocation,
    status: "active",
    emergency: form.emergency,
    acceptedBy: null,
    completedAt: null,
    createdAt: serverTimestamp(),
  });
};

// ✅ Named export
export const subscribeToUserRequests = (
  userId: string,
  callback: any
) => {
  const q = query(
    collection(db, "blood_requests"),
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
  const firestoreData = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  callback((prev: any[]) => {
    // 🔴 Remove duplicates using clientId
    const merged = [...firestoreData];

    prev.forEach((local) => {
      const exists = firestoreData.find(
        (f: any) => f.clientId && f.clientId === (local as any).clientId
      );

      if (!exists && local.id.startsWith("req-")) {
        merged.push(local); // keep local until server sync
      }
    });

    // 🔴 sort
    merged.sort((a: any, b: any) => {
      const t1 = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
      const t2 = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
      return t2 - t1;
    });

    return merged;
  });
});
};
