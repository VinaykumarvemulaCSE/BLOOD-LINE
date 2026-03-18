import { addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COMPATIBILITY } from "@/lib/bloodCompatibility";

const ADMIN_EMAIL = "kumarvinay072007@gmail.com";

export const sendSOSAlert = async (profile: any, userId: string) => {
  try {
    const compatibleBloodGroups = COMPATIBILITY[profile.bloodGroup as keyof typeof COMPATIBILITY] || [];

    const donorsQuery = query(
      collection(db, "users"),
      where("role", "==", "donor"),
      where("donorAvailability", "==", true),
      where("city", "==", profile.city)
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    const compatibleDonors = donorsSnapshot.docs.filter((doc) => {
      const donor = doc.data();
      return compatibleBloodGroups.includes(donor.bloodGroup);
    });

    await addDoc(collection(db, "sos_alerts"), {
      userId,
      userName: profile.name,
      userPhone: profile.phone,
      bloodGroup: profile.bloodGroup,
      city: profile.city,
      role: profile.role,
      adminEmail: ADMIN_EMAIL,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      type: "sos_emergency",
      message: `SOS Alert from ${profile.name} (${profile.bloodGroup}) in ${profile.city}. Phone: ${profile.phone}`,
      adminEmail: ADMIN_EMAIL,
      userId,
      read: false,
      priority: "critical",
      bloodGroup: profile.bloodGroup,
      location: profile.city,
      phone: profile.phone,
      createdAt: serverTimestamp(),
    });

    const notificationPromises = compatibleDonors.map((donorDoc) => {
      return addDoc(collection(db, "notifications"), {
        type: "sos_alert",
        message: `EMERGENCY: ${profile.bloodGroup} blood needed urgently in ${profile.city}. Contact: ${profile.phone}`,
        userId: donorDoc.id,
        read: false,
        priority: "high",
        bloodGroup: profile.bloodGroup,
        location: profile.city,
        phone: profile.phone,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(notificationPromises);

    return {
      success: true,
      alertedDonors: compatibleDonors.length,
      message: `SOS alert sent to ${compatibleDonors.length} compatible donors nearby`,
    };
  } catch (error) {
    console.error("SOS Alert Error:", error);
    throw error;
  }
};

export const broadcastEmergencyRequest = async (
  bloodGroup: string,
  city: string,
  hospitalLocation: string,
  contactPhone: string,
  requestId: string
) => {
  try {
    const compatibleBloodGroups = COMPATIBILITY[bloodGroup as keyof typeof COMPATIBILITY] || [];

    const donorsQuery = query(
      collection(db, "users"),
      where("role", "==", "donor"),
      where("donorAvailability", "==", true),
      where("city", "==", city)
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    const compatibleDonors = donorsSnapshot.docs.filter((doc) => {
      const donor = doc.data();
      return compatibleBloodGroups.includes(donor.bloodGroup);
    });

    const notificationPromises = compatibleDonors.map((donorDoc) => {
      return addDoc(collection(db, "notifications"), {
        type: "emergency_request",
        message: `URGENT: ${bloodGroup} blood needed at ${hospitalLocation}. Contact: ${contactPhone}`,
        userId: donorDoc.id,
        requestId,
        read: false,
        priority: "high",
        bloodGroup,
        location: hospitalLocation,
        phone: contactPhone,
        createdAt: serverTimestamp(),
      });
    });

    await Promise.all(notificationPromises);

    return {
      success: true,
      notifiedDonors: compatibleDonors.length,
    };
  } catch (error) {
    console.error("Broadcast Error:", error);
    throw error;
  }
};
