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

const DEMO_ACCOUNTS: Record<UserRole, { email: string; password: string; name: string }> = {
  donor: { email: "demo.donor@bloodline.app", password: "demo123456", name: "Demo Donor" },
  receiver: { email: "demo.receiver@bloodline.app", password: "demo123456", name: "Demo Receiver" },
  hospital: { email: "demo.hospital@bloodline.app", password: "demo123456", name: "Demo Hospital" },
  admin: { email: "demo.admin@bloodline.app", password: "demo123456", name: "Demo Admin" },
};

export { DEMO_ACCOUNTS };

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
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // If demo account doesn't exist, create it with pre-filled profile
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const demoProfile: UserProfile = {
        uid: cred.user.uid,
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
      };
      await setDoc(doc(db, "users", cred.user.uid), demoProfile);
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
