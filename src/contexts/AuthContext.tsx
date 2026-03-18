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

// Test accounts used for demo logins — updated to real registered accounts
export const DEMO_ACCOUNTS: Record<UserRole, { email: string; password: string; name: string }> = {
  donor:    { email: "test.donor@bloodline.app",    password: "BloodLine@Test2024", name: "Test Donor" },
  receiver: { email: "test.receiver@bloodline.app", password: "BloodLine@Test2024", name: "Test Receiver" },
  hospital: { email: "test.hospital@bloodline.app", password: "BloodLine@Test2024", name: "Test Hospital" },
  admin:    { email: "test.admin@bloodline.app",    password: "BloodLine@Test2024", name: "Test Admin" },
};

export { DEMO_ACCOUNTS as DEMO_ACCOUNTS_EXPORT };

// Pre-built demo profiles for each role
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
      setProfile(snap.data() as UserProfile);
    } else {
      setProfile(null);
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
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const demoLogin = async (role: UserRole) => {
    const { email, password, name } = DEMO_ACCOUNTS[role];
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // Account doesn't exist yet — create it
      cred = await createUserWithEmailAndPassword(auth, email, password);
    }

    // Always ensure Firestore profile exists (even if account was pre-existing)
    const profileRef = doc(db, "users", cred.user.uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      const demoProfile = buildDemoProfile(cred.user.uid, role, email, name);
      await setDoc(profileRef, demoProfile);
      // If hospital role, also register in hospitals collection
      if (role === "hospital") {
        await setDoc(doc(db, "hospitals", cred.user.uid), {
          uid: cred.user.uid,
          name,
          city: "Hyderabad",
          address: "Demo Address, Hyderabad",
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
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
