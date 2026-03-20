import { addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COMPATIBILITY } from "@/lib/bloodCompatibility";

const ADMIN_EMAIL = "kumarvinay072007@gmail.com";

export const sendSOSAlert = async (profile: any, userId: string) => {
  try {
    const city = (profile.city || "").trim();
    const bloodGroup = (profile.bloodGroup || "").trim();
    if (!city || !bloodGroup) {
      throw new Error("Profile must have city and blood group to send SOS.");
    }

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

    await addDoc(collection(db, "sos_alerts"), {
      userId,
      userName: profile.name || "Unknown",
      userPhone: profile.phone || "",
      bloodGroup,
      city,
      role: profile.role,
      adminEmail: ADMIN_EMAIL,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    if (profile.role === "receiver") {
      await addDoc(collection(db, "blood_requests"), {
        clientId: `sos-${Date.now()}`,
        createdBy: userId,
        creatorName: profile.name || "Unknown",
        creatorPhone: profile.phone || "",
        bloodGroup,
        units: 1,
        hospitalLocation: `${city} (Emergency SOS Location Pending)`,
        hospitalUid: null,
        status: "open",
        emergency: true,
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
    }

    await addDoc(collection(db, "notifications"), {
      type: "sos_emergency",
      message: `SOS Alert from ${profile.name || "User"} (${bloodGroup}) in ${city}. Phone: ${profile.phone || "—"}`,
      adminEmail: ADMIN_EMAIL,
      userId,
      read: false,
      priority: "critical",
      bloodGroup,
      location: city,
      phone: profile.phone || "",
      createdAt: serverTimestamp(),
    });

    const notificationPromises = compatibleDonors.map((donorDoc) => {
      return addDoc(collection(db, "notifications"), {
        type: "sos_alert",
        message: `EMERGENCY: ${bloodGroup} blood needed urgently in ${city}. Contact: ${profile.phone || "—"}`,
        userId: donorDoc.id,
        read: false,
        priority: "high",
        bloodGroup,
        location: city,
        phone: profile.phone || "",
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
