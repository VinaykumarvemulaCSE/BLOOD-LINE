import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CAN_RECEIVE_FROM, getDaysUntilEligible } from "@/lib/bloodCompatibility";

interface DonorMatch {
  uid: string;
  name: string;
  phone: string;
  bloodGroup: string;
  city: string;
  reputationScore: number;
  lastDonationDate: string | null;
  matchScore: number;
  distance?: number;
  eligibilityDays: number;
  isEligible: boolean;
}

export const findMatchingDonors = async (
  bloodGroup: string,
  city: string,
  emergency: boolean = false,
  userLocation?: { lat: number; lng: number }
): Promise<DonorMatch[]> => {
  try {
    const compatibleBloodGroups = CAN_RECEIVE_FROM[bloodGroup as keyof typeof CAN_RECEIVE_FROM] || [];

    const donorsQuery = query(
      collection(db, "users"),
      where("role", "==", "donor"),
      where("donorAvailability", "==", true),
      where("city", "==", city),
      where("bloodGroup", "in", compatibleBloodGroups.slice(0, 10))
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    const matches: DonorMatch[] = [];

    donorsSnapshot.forEach((doc) => {
      const donor = doc.data();
      const eligibilityDays = getDaysUntilEligible(donor.lastDonationDate || null);
      const isEligible = eligibilityDays === 0;

      let matchScore = 0;

      if (isEligible) matchScore += 50;
      else matchScore -= eligibilityDays;

      matchScore += (donor.reputationScore || 50);

      if (donor.bloodGroup === bloodGroup) matchScore += 20;

      if (emergency && isEligible) matchScore += 30;

      matches.push({
        uid: doc.id,
        name: donor.name,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        city: donor.city,
        reputationScore: donor.reputationScore || 50,
        lastDonationDate: donor.lastDonationDate || null,
        matchScore,
        eligibilityDays,
        isEligible,
      });
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches.slice(0, 20);
  } catch (error) {
    console.error("Matching Error:", error);
    return [];
  }
};

export const autoMatchDonor = async (requestId: string, bloodGroup: string, city: string, emergency: boolean) => {
  try {
    const matches = await findMatchingDonors(bloodGroup, city, emergency);

    if (matches.length === 0) {
      return { success: false, message: "No matching donors found" };
    }

    const topMatch = matches[0];

    if (!topMatch.isEligible) {
      return {
        success: false,
        message: `Best match not eligible for ${topMatch.eligibilityDays} more days`,
        topMatch,
      };
    }

    return {
      success: true,
      donor: topMatch,
      alternates: matches.slice(1, 5),
    };
  } catch (error) {
    console.error("Auto-match Error:", error);
    return { success: false, message: "Matching failed" };
  }
};

export const calculateDonorRanking = async (city: string) => {
  try {
    const donorsQuery = query(
      collection(db, "users"),
      where("role", "==", "donor"),
      where("city", "==", city)
    );

    const donorsSnapshot = await getDocs(donorsQuery);
    const rankings: any[] = [];

    donorsSnapshot.forEach((doc) => {
      const donor = doc.data();
      rankings.push({
        uid: doc.id,
        name: donor.name,
        bloodGroup: donor.bloodGroup,
        reputationScore: donor.reputationScore || 50,
        lastDonationDate: donor.lastDonationDate,
      });
    });

    rankings.sort((a, b) => b.reputationScore - a.reputationScore);

    return rankings;
  } catch (error) {
    console.error("Ranking Error:", error);
    return [];
  }
};
