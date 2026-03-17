import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_EMAIL = "kumarvinay072007@gmail.com";

export const sendSOSAlert = async (profile: any, userId: string) => {
  // Create SOS alert
  await addDoc(collection(db, "sos_alerts"), {
    userId,
    userName: profile.name,
    userPhone: profile.phone,
    bloodGroup: profile.bloodGroup,
    city: profile.city,
    role: profile.role,
    adminEmail: ADMIN_EMAIL,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Create notification
  await addDoc(collection(db, "notifications"), {
    type: "sos_emergency",
    message: `🚨 SOS Alert from ${profile.name} (${profile.bloodGroup}) in ${profile.city}. Phone: ${profile.phone}`,
    adminEmail: ADMIN_EMAIL,
    userId,
    read: false,
    createdAt: new Date().toISOString(),
  });
};