export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

export const COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  "O-":  ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "O+":  ["A+", "B+", "AB+", "O+"],
  "A-":  ["A+", "A-", "AB+", "AB-"],
  "A+":  ["A+", "AB+"],
  "B-":  ["B+", "B-", "AB+", "AB-"],
  "B+":  ["B+", "AB+"],
  "AB-": ["AB+", "AB-"],
  "AB+": ["AB+"],
};

export const CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  "O-":  ["O-"],
  "O+":  ["O-", "O+"],
  "A-":  ["O-", "A-"],
  "A+":  ["O-", "O+", "A-", "A+"],
  "B-":  ["O-", "B-"],
  "B+":  ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export function getDaysUntilEligible(lastDonationDate: string | null): number {
  if (!lastDonationDate) return 0;
  const last = new Date(lastDonationDate);
  const eligible = new Date(last.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((eligible.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function isEligibleToDonate(lastDonationDate: string | null): boolean {
  return getDaysUntilEligible(lastDonationDate) === 0;
}
