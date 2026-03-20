import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export type UserRole = "donor" | "receiver" | "hospital" | "admin";

const ADMIN_EMAILS = "kumarvinay072007@gmail.com";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  city: string;
  address: string;
  role: UserRole;
  age?: number;
  weight?: number;
  healthConfirmed?: boolean;
  lastDonationDate?: string | null;
  donorAvailability?: boolean;
  reputationScore?: number;
  profileCompleted: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export const DEMO_ACCOUNTS: Record<UserRole, { email: string; password: string; name: string }> = {
  donor: { email: "test.donor@bloodline.app", password: "BloodLine@Test2026", name: "Test Donor" },
  receiver: { email: "test.receiver@bloodline.app", password: "BloodLine@Test2026", name: "Test Receiver" },
  hospital: { email: "test.hospital@bloodline.app", password: "BloodLine@Test2026", name: "Test Hospital" },
  admin: { email: ADMIN_EMAILS, password: "Vinay@123", name: "Vinay Kumar" },
};

export { DEMO_ACCOUNTS as DEMO_ACCOUNTS_EXPORT };

const buildDemoProfile = (uid: string, role: UserRole, email: string, name: string): UserProfile => ({
  uid,
  name,
  email,
  phone: "+91 9876543210",
  bloodGroup: role === "receiver" ? "A+" : "O+",
  city: "Hyderabad",
  address: "Demo Address, Hyderabad",
  role,
  age: 28,
  weight: 65,
  healthConfirmed: true,
  lastDonationDate: null,
  donorAvailability: role === "donor",
  reputationScore: 50,
  profileCompleted: true,
  createdAt: new Date().toISOString(),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u: User) => {
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      setProfile({ ...data, uid: data?.uid ?? u.uid } as UserProfile);
    } else {
      setProfile(null);
    }
  };

  const getDemoRoleByEmail = (email: string | null | undefined): UserRole | null => {
    const normalized = (email || "").trim().toLowerCase();
    const roles = Object.keys(DEMO_ACCOUNTS) as UserRole[];
    for (const r of roles) {
      if (DEMO_ACCOUNTS[r].email.trim().toLowerCase() === normalized) return r;
    }
    return null;
  };

  const seedDemoProfileIfNeeded = async (uid: string, role: UserRole, email: string) => {
    const name = DEMO_ACCOUNTS[role].name;
    const profileRef = doc(db, "users", uid);
    const snap = await getDoc(profileRef);

    const shouldUpsert =
      !snap.exists() ||
      snap.data()?.profileCompleted !== true ||
      snap.data()?.role !== role;

    if (shouldUpsert) {
      const demoProfile = buildDemoProfile(uid, role, email, name);
      await setDoc(profileRef, demoProfile);

      if (role === "hospital") {
        await setDoc(doc(db, "hospitals", uid), {
          uid,
          name,
          city: "Hyderabad",
          address: "Demo Address, Hyderabad",
          verified: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (role === "hospital") {
      // Ensure the hospital document exists for hospital demo users.
      const hospRef = doc(db, "hospitals", uid);
      const hospSnap = await getDoc(hospRef);
      if (!hospSnap.exists()) {
        await setDoc(hospRef, {
          uid,
          name,
          city: "Hyderabad",
          address: "Demo Address, Hyderabad",
          verified: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const demoRole = getDemoRoleByEmail(email);
    if (demoRole) {
      await seedDemoProfileIfNeeded(cred.user.uid, demoRole, email);
      await fetchProfile(cred.user);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const demoRole = getDemoRoleByEmail(email);
    if (demoRole) {
      await seedDemoProfileIfNeeded(cred.user.uid, demoRole, email);
      await fetchProfile(cred.user);
    }
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const existingProfile = await getDoc(doc(db, "users", result.user.uid));

    if (!existingProfile.exists()) {
      const defaultRole = ADMIN_EMAILS.includes(result.user.email || "") ? "admin" : "donor";
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name: result.user.displayName || "User",
        email: result.user.email || "",
        phone: "",
        bloodGroup: "O+",
        city: "",
        address: "",
        role: defaultRole,
        profileCompleted: false,
        reputationScore: 50,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const demoLogin = async (role: UserRole) => {
    const { email, password, name } = DEMO_ACCOUNTS[role];
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    }

    await seedDemoProfileIfNeeded(cred.user.uid, role, email);
    await fetchProfile(cred.user);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    const existingProfile = await getDoc(doc(db, "users", user.uid));
    const existing = existingProfile.data() as UserProfile | undefined;

    const protectedData = { ...data };

    if (existing && existing.role && data.role && existing.role !== data.role) {
      const isAdminEmail = ADMIN_EMAILS.includes(user.email || "");
      // Allow role changes during initial onboarding (e.g., Google login default role -> chosen role in Profile Setup).
      // After profile completion, restrict role changes to admin accounts.
      const canChangeRole = !existing.profileCompleted || isAdminEmail;
      if (!canChangeRole) delete protectedData.role;
    }

    await setDoc(doc(db, "users", user.uid), protectedData, { merge: true });
    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        demoLogin,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
